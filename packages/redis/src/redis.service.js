import { Injectable } from '@banhmi/common'
import { REDIS_TOKEN } from './tokens'
@Injectable()
export class RedisService {
  redis
  static inject = [REDIS_TOKEN]
  constructor(redis) {
    this.redis = redis
  }
  async get(key) {
    return this.redis.get(key)
  }
  async set(key, value, ttlSeconds) {
    if (ttlSeconds !== undefined) {
      await this.redis.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.redis.set(key, value)
    }
  }
  async del(key) {
    await this.redis.del(key)
  }
  async expire(key, seconds) {
    await this.redis.expire(key, seconds)
  }
  async publish(channel, message) {
    await this.redis.publish(channel, message)
  }
  subscribe(channel, callback) {
    this.redis.subscribe(channel)
    this.redis.on('message', (_ch, msg) => {
      if (_ch === channel) callback(msg)
    })
  }
  async quit() {
    await this.redis.quit()
  }
}
