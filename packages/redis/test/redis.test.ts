import { describe, expect, mock, test } from 'bun:test'
import type { Redis } from 'ioredis'
import { RedisService } from '../src/redis.service'

function makeMockRedis() {
  return {
    get: mock(async (_key: string): Promise<string | null> => null),
    set: mock(async (..._args: unknown[]) => 'OK' as unknown as undefined),
    del: mock(async (_key: string) => 1),
    expire: mock(async (_key: string, _sec: number) => 1),
    publish: mock(async (_ch: string, _msg: string) => 1),
    subscribe: mock((_ch: string) => {}),
    on: mock((_event: string, _cb: unknown) => {}),
    quit: mock(async () => 'OK' as unknown as undefined),
  }
}

describe('RedisService', () => {
  test('get delegates to ioredis', async () => {
    const mockRedis = makeMockRedis()
    mockRedis.get.mockResolvedValueOnce('cached-value')
    const svc = new RedisService(mockRedis as unknown as Redis)
    const result = await svc.get('myKey')
    expect(result).toBe('cached-value')
    expect(mockRedis.get).toHaveBeenCalledWith('myKey')
  })

  test('set delegates to ioredis with TTL', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis as unknown as Redis)
    await svc.set('myKey', 'myValue', 120)
    expect(mockRedis.set).toHaveBeenCalledWith('myKey', 'myValue', 'EX', 120)
  })

  test('set without TTL calls set without EX', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis as unknown as Redis)
    await svc.set('myKey', 'myValue')
    expect(mockRedis.set).toHaveBeenCalledWith('myKey', 'myValue')
  })

  test('del delegates to ioredis', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis as unknown as Redis)
    await svc.del('myKey')
    expect(mockRedis.del).toHaveBeenCalledWith('myKey')
  })

  test('expire delegates to ioredis', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis as unknown as Redis)
    await svc.expire('myKey', 300)
    expect(mockRedis.expire).toHaveBeenCalledWith('myKey', 300)
  })
})
