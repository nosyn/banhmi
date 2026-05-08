import { describe, expect, mock, test } from 'bun:test'
import { RedisService } from '../src/redis.service'

function makeMockRedis() {
  return {
    get: mock(async (_key) => null),
    set: mock(async (..._args) => 'OK'),
    del: mock(async (_key) => 1),
    expire: mock(async (_key, _sec) => 1),
    publish: mock(async (_ch, _msg) => 1),
    subscribe: mock((_ch) => {}),
    on: mock((_event, _cb) => {}),
    quit: mock(async () => 'OK'),
  }
}
describe('RedisService', () => {
  test('get delegates to ioredis', async () => {
    const mockRedis = makeMockRedis()
    mockRedis.get.mockResolvedValueOnce('cached-value')
    const svc = new RedisService(mockRedis)
    const result = await svc.get('myKey')
    expect(result).toBe('cached-value')
    expect(mockRedis.get).toHaveBeenCalledWith('myKey')
  })
  test('set delegates to ioredis with TTL', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis)
    await svc.set('myKey', 'myValue', 120)
    expect(mockRedis.set).toHaveBeenCalledWith('myKey', 'myValue', 'EX', 120)
  })
  test('set without TTL calls set without EX', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis)
    await svc.set('myKey', 'myValue')
    expect(mockRedis.set).toHaveBeenCalledWith('myKey', 'myValue')
  })
  test('del delegates to ioredis', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis)
    await svc.del('myKey')
    expect(mockRedis.del).toHaveBeenCalledWith('myKey')
  })
  test('expire delegates to ioredis', async () => {
    const mockRedis = makeMockRedis()
    const svc = new RedisService(mockRedis)
    await svc.expire('myKey', 300)
    expect(mockRedis.expire).toHaveBeenCalledWith('myKey', 300)
  })
})
