import { describe, expect, mock, test } from 'bun:test'
import { RedisService } from '../src/redis.service'

function makeMockRedis() {
  return {
    get: mock(async (_key) => null),
    set: mock(async (..._args) => 'OK'),
    del: mock(async (_key) => 1),
    expire: mock(async (_key, _sec) => 1),
    pexpire: mock(async (_key, _ms) => 1),
    pttl: mock(async (_key) => -1),
    incr: mock(async (_key) => 1),
    publish: mock(async (_ch, _msg) => 1),
    subscribe: mock((_ch, _cb) => {}),
    hset: mock(async (_key, _fields) => 1),
    hgetall: mock(async (_key) => ({})),
    lpush: mock(async (_key, _value) => 1),
    rpop: mock(async (_key) => null),
    zadd: mock(async (_key, _score, _member) => 1),
    zrangebyscore: mock(async (_key, _min, _max) => []),
    zrem: mock(async (_key, _member) => 1),
    close: mock(() => {}),
  }
}
describe('RedisService', () => {
  test('get delegates to underlying client', async () => {
    const mockRedis = makeMockRedis()
    mockRedis.get.mockResolvedValueOnce('cached-value')
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
