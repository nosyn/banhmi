/**
 * Integration tests for @banhmi/queue with a real Redis instance.
 *
 * These tests are skipped automatically when no Redis connection is available.
 * Set `REDIS_URL` (e.g. `redis://localhost:6379`) to run them.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Process } from '../src/process.decorator'
import { Processor } from '../src/processor.decorator'
import { Queue } from '../src/queue'
import { Worker } from '../src/worker'

let redis: import('ioredis').Redis | null = null
let skip = false

beforeAll(async () => {
  const url = Bun.env.REDIS_URL ?? 'redis://localhost:6379'
  try {
    const { default: IORedis } = await import('ioredis')
    const client = new IORedis(url, {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
    })
    await client.connect()
    await client.ping()
    redis = client
  } catch {
    skip = true
    console.log('skipping integration tests — Redis unavailable')
  }
})

afterAll(async () => {
  if (redis) {
    await redis.quit()
  }
})

describe('Queue + Worker integration', () => {
  test('enqueue + immediate process', async () => {
    if (skip || !redis) return

    const queueName = `test-immediate-${Date.now()}`
    let processed = 0

    @Processor(queueName)
    class ImmediateProcessor {
      @Process('work')
      async work(_ctx: unknown) {
        processed++
      }
    }

    const queue = new Queue(queueName, redis)
    const workerRedis = redis.duplicate()
    const instance = new ImmediateProcessor()
    const worker = new Worker(
      queueName,
      workerRedis,
      instance,
      ImmediateProcessor,
      20,
    )

    worker.start()
    await queue.add('work', { payload: 'hello' })

    await new Promise((r) => setTimeout(r, 300))
    await worker.stop()
    await workerRedis.quit()

    expect(processed).toBe(1)
  })

  test('delayed job processed after delay', async () => {
    if (skip || !redis) return

    const queueName = `test-delayed-${Date.now()}`
    let processed = 0

    @Processor(queueName)
    class DelayedProcessor {
      @Process('delayed-work')
      async work(_ctx: unknown) {
        processed++
      }
    }

    const queue = new Queue(queueName, redis)
    const workerRedis = redis.duplicate()
    const instance = new DelayedProcessor()
    const worker = new Worker(
      queueName,
      workerRedis,
      instance,
      DelayedProcessor,
      20,
    )

    worker.start()
    await queue.add('delayed-work', {}, { delay: 100 })

    // not yet processed
    await new Promise((r) => setTimeout(r, 50))
    expect(processed).toBe(0)

    // now it should be ready
    await new Promise((r) => setTimeout(r, 300))
    await worker.stop()
    await workerRedis.quit()

    expect(processed).toBe(1)
  })

  test('failure retries up to attempts count', async () => {
    if (skip || !redis) return

    const queueName = `test-retries-${Date.now()}`
    let callCount = 0

    @Processor(queueName)
    class RetryProcessor {
      @Process('flaky')
      async work(_ctx: unknown) {
        callCount++
        if (callCount < 3) throw new Error('transient')
      }
    }

    const queue = new Queue(queueName, redis)
    const workerRedis = redis.duplicate()
    const instance = new RetryProcessor()
    const worker = new Worker(
      queueName,
      workerRedis,
      instance,
      RetryProcessor,
      20,
    )

    worker.start()
    await queue.add('flaky', {}, { attempts: 3 })

    await new Promise((r) => setTimeout(r, 500))
    await worker.stop()
    await workerRedis.quit()

    expect(callCount).toBe(3)
  })

  test('multiple processors on isolated queues', async () => {
    if (skip || !redis) return

    const queue1Name = `test-q1-${Date.now()}`
    const queue2Name = `test-q2-${Date.now()}`
    let q1Count = 0
    let q2Count = 0

    @Processor(queue1Name)
    class Q1Processor {
      @Process('task')
      async task(_ctx: unknown) {
        q1Count++
      }
    }

    @Processor(queue2Name)
    class Q2Processor {
      @Process('task')
      async task(_ctx: unknown) {
        q2Count++
      }
    }

    const q1 = new Queue(queue1Name, redis)
    const q2 = new Queue(queue2Name, redis)

    const r1 = redis.duplicate()
    const r2 = redis.duplicate()

    const w1 = new Worker(queue1Name, r1, new Q1Processor(), Q1Processor, 20)
    const w2 = new Worker(queue2Name, r2, new Q2Processor(), Q2Processor, 20)

    w1.start()
    w2.start()

    await q1.add('task', {})
    await q1.add('task', {})
    await q2.add('task', {})

    await new Promise((r) => setTimeout(r, 400))

    await w1.stop()
    await w2.stop()
    await r1.quit()
    await r2.quit()

    expect(q1Count).toBe(2)
    expect(q2Count).toBe(1)
  })
})
