import type { RedisService } from '@banhmi/redis'
import type { SessionData, SessionStore } from '../types'

/**
 * Redis-backed session store using `@banhmi/redis`.
 *
 * Requires `@banhmi/redis` to be installed (peer dependency).
 * Import from the subpath `@banhmi/session/redis` to avoid loading Redis
 * code when only using the memory store.
 *
 * @example
 * import { RedisSessionStore } from '@banhmi/session/redis'
 *
 * SessionModule.forRoot({
 *   secret: 'my-secret',
 *   store: new RedisSessionStore(redisService),
 * })
 */
export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: RedisService) {}

  /**
   * Load session data by id from Redis.
   *
   * @param id - Session id.
   * @returns Parsed session data, or `null` if the key doesn't exist.
   */
  async get(id: string): Promise<SessionData | null> {
    const raw = await this.redis.get(`sess:${id}`)
    if (!raw) return null
    try {
      return JSON.parse(raw) as SessionData
    } catch {
      return null
    }
  }

  /**
   * Persist session data in Redis with a TTL.
   *
   * @param id - Session id.
   * @param data - Session payload.
   * @param ttlSeconds - Time-to-live in seconds.
   */
  async set(id: string, data: SessionData, ttlSeconds: number): Promise<void> {
    await this.redis.set(`sess:${id}`, JSON.stringify(data), ttlSeconds)
  }

  /**
   * Delete a session from Redis.
   *
   * @param id - Session id.
   */
  async destroy(id: string): Promise<void> {
    await this.redis.del(`sess:${id}`)
  }
}
