import type { CacheStore } from '@banhmi/cache'
import type { RedisLike } from './types'

export class RedisCacheStore implements CacheStore {
  private client: RedisLike | null = null

  constructor(private readonly url: string) {}

  private getClient(): RedisLike {
    if (!this.client) {
      const bunClient = new Bun.RedisClient(this.url)
      this.client = {
        get: (key) => bunClient.get(key),
        set: (key, value, ttlSeconds) =>
          ttlSeconds !== undefined
            ? bunClient.set(key, value, 'EX', ttlSeconds)
            : bunClient.set(key, value),
        del: (key) => bunClient.del(key),
        expire: (key, seconds) => bunClient.expire(key, seconds),
        pexpire: (key, ms, nx) =>
          nx === 'NX'
            ? (bunClient.send('PEXPIRE', [
                key,
                String(ms),
                'NX',
              ]) as Promise<number>)
            : bunClient.pexpire(key, ms),
        pttl: (key) => bunClient.pttl(key),
        incr: (key) => bunClient.incr(key),
        publish: (channel, message) => bunClient.publish(channel, message),
        subscribe: (channel, listener) => {
          void bunClient.subscribe(channel, (msg: string) => listener(msg))
        },
        hset: (key, fields) => bunClient.hset(key, fields),
        hgetall: (key) => bunClient.hgetall(key),
        lpush: (key, value) => bunClient.lpush(key, value),
        rpop: (key) => bunClient.rpop(key),
        zadd: (key, score, member) =>
          bunClient.zadd(key, String(score), member),
        zrangebyscore: (key, min, max) =>
          bunClient.zrangebyscore(key, min, max),
        zrem: (key, member) => bunClient.zrem(key, member),
        close: () => bunClient.close(),
      }
    }
    return this.client
  }

  async get(key: string): Promise<unknown> {
    const val = await this.getClient().get(key)
    if (val === null) return null
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.getClient().set(key, JSON.stringify(value), ttlSeconds)
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key)
  }
}
