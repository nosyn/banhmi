import { describe, expect, mock, test } from 'bun:test'
import { RedisService } from '../src/redis.service'
import type { RedisLike } from '../src/types'

function makeMockRedis(): RedisLike {
  return {
    get: mock(async (_key: string): Promise<string | null> => null),
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
    zrangebyscore: mock(
      async (_key: string, _min: unknown, _max: unknown) => [] as string[],
    ),
    zrem: mock(async (_key: string, _member: string) => 1),
    close: mock(() => {}),
  }
}

describe('RedisService', () => {
  test('get delegates to underlying client', async () => {
    const mockRedis = makeMockRedis()
    ;(mockRedis.get as ReturnType<typeof mock>).mockResolvedValueOnce(
      'cached-value',
    )
    const svc = new RedisService(mockRedis)
    const result = await svc.get('myKey')
    expect(result).toBe('cached-value')
    expect(mockRedis.get).toHaveBeenCalledWith('myKey')
  })

  test('set with TTL delegates to client with ttlSeconds', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis)
    await svc.set('myKey', 'myValue', 120)
    expect(mockRedis.set).toHaveBeenCalledWith('myKey', 'myValue', 120)
  })

  test('set without TTL calls set with no ttlSeconds', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis)
    await svc.set('myKey', 'myValue')
    expect(mockRedis.set).toHaveBeenCalledWith('myKey', 'myValue', undefined)
  })

  test('del delegates to underlying client', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis)
    await svc.del('myKey')
    expect(mockRedis.del).toHaveBeenCalledWith('myKey')
  })

  test('expire delegates to underlying client', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis)
    await svc.expire('myKey', 300)
    expect(mockRedis.expire).toHaveBeenCalledWith('myKey', 300)
  })
})
