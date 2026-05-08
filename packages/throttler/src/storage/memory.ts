import type { ThrottlerStorage } from '../types'

/** Internal per-key record stored in the in-memory map. */
type BucketEntry = {
  count: number
  expiresAt: number
}

/**
 * In-memory {@link ThrottlerStorage} implementation.
 *
 * Uses a `Map` to track per-key counters. Expired entries are reset
 * automatically on the next `increment` call for that key.
 *
 * @example
 * const storage = new MemoryThrottlerStorage()
 * ThrottlerModule.forRoot({ ttl: 60_000, limit: 100, storage })
 */
export class MemoryThrottlerStorage implements ThrottlerStorage {
  private readonly store = new Map<string, BucketEntry>()

  /**
   * Increment the counter for `key`. If the key does not exist or has
   * expired, a new window is started from now.
   *
   * @param key - Composite rate-limit key.
   * @param ttlMs - Window duration in milliseconds.
   * @returns The updated count and Unix-ms reset timestamp.
   *
   * @example
   * const { count, resetAt } = await storage.increment('route:ip', 60_000)
   */
  async increment(
    key: string,
    ttlMs: number,
  ): Promise<{ count: number; resetAt: number }> {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || existing.expiresAt <= now) {
      // Start a new window
      const expiresAt = now + ttlMs
      this.store.set(key, { count: 1, expiresAt })
      return { count: 1, resetAt: expiresAt }
    }

    existing.count += 1
    return { count: existing.count, resetAt: existing.expiresAt }
  }
}
