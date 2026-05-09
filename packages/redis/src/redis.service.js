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
    await this.redis.set(key, value, ttlSeconds)
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
    this.redis.subscribe(channel, callback)
  }
  close() {
    this.redis.close()
  }
}
