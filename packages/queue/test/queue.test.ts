import { describe, expect, mock, test } from 'bun:test'
import type { RedisLike } from '@banhmi/redis'
import { Queue } from '../src/queue'

function makeMockRedis(): RedisLike {
  return {
    get: mock(async (_key: string) => null),
    set: mock(async (..._args: unknown[]) => 'OK'),
    del: mock(async (_key: string) => 1),
    expire: mock(async (_key: string, _sec: number) => 1),
    pexpire: mock(async (_key: string, _ms: number) => 1),
    pttl: mock(async (_key: string) => -1),
    incr: mock(async (_key: string) => 1),
    publish: mock(async (_ch: string, _msg: string) => 1),
    subscribe: mock((_ch: string, _cb: (msg: string) => void) => {}),
    hset: mock(async (_key: string, _fields: Record<string, string>) => 1),
    hgetall: mock(async (_key: string) => ({}) as Record<string, string>),
    lpush: mock(async (_key: string, _value: string) => 1),
    rpop: mock(async (_key: string) => null),
    zadd: mock(async (_key: string, _score: number, _member: string) => 1),
    zrangebyscore: mock(async (..._args: unknown[]) => [] as string[]),
    zrem: mock(async (_key: string, _member: string) => 1),
    close: mock(() => {}),
  }
}

describe('Queue', () => {
  test('add writes the job hash with correct fields', async () => {
    const redis = makeMockRedis()
    const queue = new Queue<{ email: string }>('emails', redis)

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
    const queue = new Queue('emails', redis)

    const job = await queue.add('send', { to: 'a@b.com' })

    expect(redis.lpush).toHaveBeenCalledWith(`emails:waiting`, job.id)
    expect(redis.zadd).not.toHaveBeenCalled()
  })

  test('add with delay does ZADD onto delayed sorted set', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis)

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
    const queue = new Queue('emails', redis)

    const job = await queue.add('send', {}, { jobId: 'custom-id-123' })

    expect(job.id).toBe('custom-id-123')
  })

  test('add stores attempts in hash', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis)

    await queue.add('send', {}, { attempts: 3 })

    const [, hashData] = redis.hset.mock.calls[0]
    expect((hashData as Record<string, string>).attempts).toBe('3')
  })

  test('add stores backoff config in hash', async () => {
    const redis = makeMockRedis()
    const queue = new Queue('emails', redis)

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
    const queue = new Queue('emails', redis)

    const job1 = await queue.add('send', {})
    const job2 = await queue.add('send', {})

    expect(job1.id).not.toBe(job2.id)
  })
})
