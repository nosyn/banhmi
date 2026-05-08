import { describe, expect, mock, test } from 'bun:test'
import type { Redis } from 'ioredis'
import { Queue } from '../src/queue'

function makeMockRedis() {
  return {
    hset: mock(async (..._args: unknown[]) => 1),
    hgetall: mock(async (_key: string) => null),
    lpush: mock(async (..._args: unknown[]) => 1),
    rpop: mock(async (_key: string) => null),
    zadd: mock(async (..._args: unknown[]) => 1),
    zrangebyscore: mock(async (..._args: unknown[]) => [] as string[]),
    zrem: mock(async (..._args: unknown[]) => 1),
    get: mock(async (_key: string) => null),
    set: mock(async (..._args: unknown[]) => 'OK'),
    del: mock(async (_key: string) => 1),
  }
}

describe('Queue', () => {
  test('add writes the job hash with correct fields', async () => {
    const redis = makeMockRedis()
    const queue = new Queue<{ email: string }>(
      'emails',
      redis as unknown as Redis,
    )

    const job = await queue.add('send', { email: 'user@example.com' })

    expect(job.name).toBe('send')
    expect(job.data).toEqual({ email: 'user@example.com' })
    expect(job.attemptsMade).toBe(0)
    expect(typeof job.id).toBe('string')
    expect(typeof job.createdAt).toBe('number')

    expect(redis.hset).toHaveBeenCalledTimes(1)
    const [hashKey, hashData] = redis.hset.mock.calls[0]
    expect(hashKey).toBe(`emails:job:${job.id}`)
    expect((hashData as Record<string, string>).name).toBe('send')
    expect(JSON.parse((hashData as Record<string, string>).data)).toEqual({
      email: 'user@example.com',
    })
  })

  test('add without delay does LPUSH onto waiting list', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis as unknown as Redis)

    const job = await queue.add('send', { to: 'a@b.com' })

    expect(redis.lpush).toHaveBeenCalledWith(`emails:waiting`, job.id)
    expect(redis.zadd).not.toHaveBeenCalled()
  })

  test('add with delay does ZADD onto delayed sorted set', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis as unknown as Redis)

    const before = Date.now()
    const job = await queue.add('remind', { to: 'a@b.com' }, { delay: 5000 })
    const after = Date.now()

    expect(redis.zadd).toHaveBeenCalledTimes(1)
    const [key, score, id] = redis.zadd.mock.calls[0]
    expect(key).toBe('emails:delayed')
    expect(Number(score)).toBeGreaterThanOrEqual(before + 5000)
    expect(Number(score)).toBeLessThanOrEqual(after + 5000)
    expect(id).toBe(job.id)
    expect(redis.lpush).not.toHaveBeenCalled()
  })

  test('add returns a Job with correct id when jobId is provided', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis as unknown as Redis)

    const job = await queue.add('send', {}, { jobId: 'custom-id-123' })

    expect(job.id).toBe('custom-id-123')
  })

  test('add stores attempts in hash', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis as unknown as Redis)

    await queue.add('send', {}, { attempts: 3 })

    const [, hashData] = redis.hset.mock.calls[0]
    expect((hashData as Record<string, string>).attempts).toBe('3')
  })

  test('add stores backoff config in hash', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis as unknown as Redis)

    await queue.add(
      'send',
      {},
      { backoff: { type: 'exponential', delay: 1000 } },
    )

    const [, hashData] = redis.hset.mock.calls[0]
    expect((hashData as Record<string, string>).backoffType).toBe('exponential')
    expect((hashData as Record<string, string>).backoffDelay).toBe('1000')
  })

  test('add returns unique ids for multiple jobs', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis as unknown as Redis)

    const job1 = await queue.add('send', {})
    const job2 = await queue.add('send', {})

    expect(job1.id).not.toBe(job2.id)
  })
})
