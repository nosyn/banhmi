/**
 * Redis-backed {@link ThrottlerStorage} for distributed rate limiting.
 *
 * Uses `INCR` + `PEXPIRE NX` (set TTL only on first increment) to implement
 * an atomic sliding-window counter via `ioredis`.
 *
 * This module is available via the subpath export `@banhmi/throttler/redis`.
 * It requires `@banhmi/redis` as a peer dependency.
 *
 * @example
 * import { RedisThrottlerStorage } from '@banhmi/throttler/redis'
 * import { ThrottlerModule } from '@banhmi/throttler'
 *
 * ThrottlerModule.forRoot({ ttl: 60_000, limit: 100, storage: new RedisThrottlerStorage(redisClient) })
 */

import type { Redis } from 'ioredis'
import type { ThrottlerStorage } from '../types'

/**
 * Redis-backed throttler storage. Uses atomic `INCR` + `PEXPIRE NX` so the
 * TTL is set only on the first increment of each window.
 *
 * @example
 * const storage = new RedisThrottlerStorage(ioredisClient)
 * const { count, resetAt } = await storage.increment('key', 60_000)
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  /**
   * @param redis - An `ioredis` Redis client instance.
   */
  constructor(private readonly redis: Redis) {}

  /**
   * Atomically increment the counter for `key` in Redis.
   *
   * Uses `INCR` followed by `PEXPIRE <key> <ttlMs> NX` to start the window
   * only on the first increment.
   *
   * @param key - Composite rate-limit key.
   * @param ttlMs - Window duration in milliseconds.
   * @returns The current count and Unix-ms reset timestamp.
   *
   * @example
   * const { count, resetAt } = await storage.increment('route:ip', 60_000)
   */
  async increment(
    key: string,
    ttlMs: number,
  ): Promise<{ count: number; resetAt: number }> {
    const count = await this.redis.incr(key)
    // NX: set expiry only if not already set (i.e., on first increment)
    await this.redis.pexpire(key, ttlMs, 'NX')
    // Get remaining TTL to compute reset timestamp
    const remainingMs = await this.redis.pttl(key)
    const resetAt =
      remainingMs > 0 ? Date.now() + remainingMs : Date.now() + ttlMs
    return { count, resetAt }
  }
}
