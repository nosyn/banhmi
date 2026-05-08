export class RedisCacheStore {
  url
  redis = null
  constructor(url) {
    this.url = url
  }
  async getRedis() {
    if (!this.redis) {
      const { default: IORedis } = await import('ioredis')
      this.redis = new IORedis(this.url)
    }
    return this.redis
  }
  async get(key) {
    const redis = await this.getRedis()
    const val = await redis.get(key)
    if (val === null) return null
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  }
  async set(key, value, ttlSeconds) {
    const redis = await this.getRedis()
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }
  async del(key) {
    const redis = await this.getRedis()
    await redis.del(key)
  }
}
