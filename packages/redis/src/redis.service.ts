import { Injectable } from '@banhmi/common'
import type { Redis } from 'ioredis'
import { REDIS_TOKEN } from './tokens'

@Injectable()
export class RedisService {
  static inject = [REDIS_TOKEN] as const

  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.redis.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.redis.set(key, value)
    }
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
    this.redis.subscribe(channel)
    this.redis.on('message', (_ch: string, msg: string) => {
      if (_ch === channel) callback(msg)
    })
  }

  async quit(): Promise<void> {
    await this.redis.quit()
  }
}
