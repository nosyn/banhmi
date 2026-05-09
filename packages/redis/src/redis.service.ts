import { Injectable } from '@banhmi/common'
import { REDIS_TOKEN } from './tokens'
import type { RedisLike } from './types'

@Injectable()
export class RedisService {
  static inject = [REDIS_TOKEN] as const

  constructor(private readonly redis: RedisLike) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.redis.set(key, value, ttlSeconds)
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds)
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message)
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    this.redis.subscribe(channel, callback)
  }

  close(): void {
    this.redis.close()
  }
}
