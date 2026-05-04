import type { CacheStore } from '@banhmi/cache'

export class RedisCacheStore implements CacheStore {
  private redis: import('ioredis').Redis | null = null

  constructor(private readonly url: string) {}

  private async getRedis(): Promise<import('ioredis').Redis> {
    if (!this.redis) {
      const { default: IORedis } = await import('ioredis')
      this.redis = new IORedis(this.url)
    }
    return this.redis
  }

  async get(key: string): Promise<unknown> {
    const redis = await this.getRedis()
    const val = await redis.get(key)
    if (val === null) return null
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const redis = await this.getRedis()
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  async del(key: string): Promise<void> {
    const redis = await this.getRedis()
    await redis.del(key)
  }
}
