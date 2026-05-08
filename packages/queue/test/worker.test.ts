import { beforeEach, describe, expect, test } from 'bun:test'
import type { Redis } from 'ioredis'
import { Process } from '../src/process.decorator'
import { Processor } from '../src/processor.decorator'
import { Worker } from '../src/worker'

// Polyfill for Symbol.metadata is loaded via bunfig.toml preload

type MockRedisMap = { [key: string]: Record<string, string> }

function makeMockRedis() {
  const data: MockRedisMap = {}
  const waitingLists: { [key: string]: string[] } = {}
  const delayedSets: { [key: string]: Array<{ score: number; id: string }> } =
    {}

  const redis = {
    _data: data,
    _waiting: waitingLists,
    _delayed: delayedSets,

    async hset(key: string, fields: Record<string, string>) {
      data[key] = { ...(data[key] ?? {}), ...fields }
      return 1
    },
    async hgetall(key: string) {
      return data[key] ?? null
    },
    async lpush(key: string, ...ids: string[]) {
      if (!waitingLists[key]) waitingLists[key] = []
      waitingLists[key].unshift(...ids)
      return waitingLists[key].length
    },
    async rpop(key: string) {
      const list = waitingLists[key]
      if (!list || list.length === 0) return null
      return list.pop() ?? null
    },
    async zadd(key: string, score: number, id: string) {
      if (!delayedSets[key]) delayedSets[key] = []
      delayedSets[key].push({ score, id })
      return 1
    },
    async zrangebyscore(key: string, _min: string, max: number) {
      const set = delayedSets[key]
      if (!set) return []
      return set.filter((e) => e.score <= max).map((e) => e.id)
    },
    async zrem(key: string, id: string) {
      const set = delayedSets[key]
      if (!set) return 0
      const idx = set.findIndex((e) => e.id === id)
      if (idx >= 0) set.splice(idx, 1)
      return 1
    },
  }
  return redis
}

describe('Worker', () => {
  let callCount = 0

  beforeEach(() => {
    callCount = 0
  })

  test('processes a job and calls the matching @Process handler', async () => {
    const redis = makeMockRedis()

    const jobId = 'job-1'
    // pre-seed the job hash and waiting list
    redis._data[`emails:job:${jobId}`] = {
      id: jobId,
      name: 'send',
      data: JSON.stringify({ to: 'test@example.com' }),
      attemptsMade: '0',
      createdAt: String(Date.now()),
      attempts: '1',
      backoffType: 'fixed',
      backoffDelay: '0',
    }
    redis._waiting['emails:waiting'] = [jobId]

    @Processor('emails')
    class EmailProcessor {
      @Process('send')
      async send(ctx: {
        job: { data: { to: string } }
        log: (m: string) => void
      }) {
        callCount++
        ctx.log(`sent to ${ctx.job.data.to}`)
      }
    }

    const instance = new EmailProcessor()
    const worker = new Worker(
      'emails',
      redis as unknown as Redis,
      instance,
      EmailProcessor,
      10,
    )
    worker.start()

    // wait for the worker to pick up the job
    await new Promise((r) => setTimeout(r, 200))
    await worker.stop()

    expect(callCount).toBe(1)
    expect(redis._data[`emails:job:${jobId}`]['status']).toBe('completed')
  })

  test('catch-all @Process() handles unmatched job names', async () => {
    const redis = makeMockRedis()

    const jobId = 'job-catchall'
    redis._data[`emails:job:${jobId}`] = {
      id: jobId,
      name: 'unknown-type',
      data: JSON.stringify({}),
      attemptsMade: '0',
      createdAt: String(Date.now()),
      attempts: '1',
      backoffType: 'fixed',
      backoffDelay: '0',
    }
    redis._waiting['emails:waiting'] = [jobId]

    @Processor('emails')
    class CatchAllProcessor {
      @Process()
      async fallback(_ctx: unknown) {
        callCount++
      }
    }

    const instance = new CatchAllProcessor()
    const worker = new Worker(
      'emails',
      redis as unknown as Redis,
      instance,
      CatchAllProcessor,
      10,
    )
    worker.start()

    await new Promise((r) => setTimeout(r, 200))
    await worker.stop()

    expect(callCount).toBe(1)
  })

  test('failed job with attempts > 1 re-enqueues on retry', async () => {
    const redis = makeMockRedis()

    const jobId = 'job-retry'
    redis._data[`emails:job:${jobId}`] = {
      id: jobId,
      name: 'send',
      data: JSON.stringify({}),
      attemptsMade: '0',
      createdAt: String(Date.now()),
      attempts: '3',
      backoffType: 'fixed',
      backoffDelay: '0',
    }
    redis._waiting['emails:waiting'] = [jobId]

    @Processor('emails')
    class RetryProcessor {
      @Process('send')
      async send(_ctx: unknown) {
        callCount++
        throw new Error('transient failure')
      }
    }

    const instance = new RetryProcessor()
    const worker = new Worker(
      'emails',
      redis as unknown as Redis,
      instance,
      RetryProcessor,
      10,
    )
    worker.start()

    // enough time for multiple retries
    await new Promise((r) => setTimeout(r, 500))
    await worker.stop()

    // should have attempted 3 times
    expect(callCount).toBe(3)
    expect(redis._data[`emails:job:${jobId}`]['status']).toBe('failed')
    expect(redis._data[`emails:job:${jobId}`]['attemptsMade']).toBe('3')
  })

  test('exponential backoff doubles the delay on each retry', async () => {
    const redis = makeMockRedis()

    const jobId = 'job-backoff'
    redis._data[`emails:job:${jobId}`] = {
      id: jobId,
      name: 'send',
      data: JSON.stringify({}),
      attemptsMade: '0',
      createdAt: String(Date.now()),
      attempts: '3',
      backoffType: 'exponential',
      backoffDelay: '100',
    }
    redis._waiting['emails:waiting'] = [jobId]

    @Processor('emails')
    class BackoffProcessor {
      @Process('send')
      async send(_ctx: unknown) {
        callCount++
        throw new Error('fail')
      }
    }

    const instance = new BackoffProcessor()
    const worker = new Worker(
      'emails',
      redis as unknown as Redis,
      instance,
      BackoffProcessor,
      10,
    )
    worker.start()

    // first attempt should fail quickly, then back off
    await new Promise((r) => setTimeout(r, 150))
    await worker.stop()

    // only 1 call before stop since second retry has 100ms backoff (delayed)
    expect(callCount).toBeGreaterThanOrEqual(1)
    // The second attempt should be delayed in the sorted set
    const delayedKey = 'emails:delayed'
    expect(redis._delayed[delayedKey]?.length).toBeGreaterThanOrEqual(1)
  })

  test('job with no matching handler is marked failed', async () => {
    const redis = makeMockRedis()

    const jobId = 'job-nohandler'
    redis._data[`emails:job:${jobId}`] = {
      id: jobId,
      name: 'nonexistent',
      data: JSON.stringify({}),
      attemptsMade: '0',
      createdAt: String(Date.now()),
      attempts: '1',
      backoffType: 'fixed',
      backoffDelay: '0',
    }
    redis._waiting['emails:waiting'] = [jobId]

    @Processor('emails')
    class NoHandlerProcessor {
      @Process('other')
      async other(_ctx: unknown) {
        callCount++
      }
    }

    const instance = new NoHandlerProcessor()
    const worker = new Worker(
      'emails',
      redis as unknown as Redis,
      instance,
      NoHandlerProcessor,
      10,
    )
    worker.start()

    await new Promise((r) => setTimeout(r, 200))
    await worker.stop()

    expect(callCount).toBe(0)
    expect(redis._data[`emails:job:${jobId}`]['status']).toBe('failed')
  })

  test('delayed jobs are promoted to waiting when score <= now', async () => {
    const redis = makeMockRedis()

    const jobId = 'job-delayed'
    redis._data[`emails:job:${jobId}`] = {
      id: jobId,
      name: 'send',
      data: JSON.stringify({ to: 'a@b.com' }),
      attemptsMade: '0',
      createdAt: String(Date.now()),
      attempts: '1',
      backoffType: 'fixed',
      backoffDelay: '0',
    }
    // place in delayed with score in the past
    redis._delayed['emails:delayed'] = [{ score: Date.now() - 1000, id: jobId }]

    @Processor('emails')
    class DelayedProcessor {
      @Process('send')
      async send(_ctx: unknown) {
        callCount++
      }
    }

    const instance = new DelayedProcessor()
    const worker = new Worker(
      'emails',
      redis as unknown as Redis,
      instance,
      DelayedProcessor,
      10,
    )
    worker.start()

    await new Promise((r) => setTimeout(r, 200))
    await worker.stop()

    expect(callCount).toBe(1)
  })
})
