/**
 * A single rate-limit configuration: time window and request cap.
 *
 * @example
 * const config: ThrottleConfig = { ttl: 60_000, limit: 100 }
 */
export type ThrottleConfig = {
  /**
   * Time window in milliseconds. The counter is reset after this period.
   * Example: `60_000` for a 1-minute window.
   */
  ttl: number
  /**
   * Maximum number of requests allowed within the TTL window.
   */
  limit: number
}

/**
 * Options for {@link ThrottlerModule.forRoot}.
 *
 * @example
 * ThrottlerModule.forRoot({ ttl: 60_000, limit: 100 })
 */
export type ThrottlerOptions = ThrottleConfig & {
  /**
   * Custom storage backend. Defaults to {@link MemoryThrottlerStorage}.
   */
  storage?: ThrottlerStorage
  /**
   * Custom key generator function. Receives the raw `Request` and must
   * return a string key used to identify the caller.
   *
   * Default: first IP from `X-Forwarded-For` or `'unknown'`.
   *
   * @example
   * keyGenerator: (req) => req.headers.get('authorization') ?? 'anon'
   */
  keyGenerator?: (req: Request) => string
}

/**
 * Storage backend contract for the throttler.
 *
 * Implementations must atomically increment a per-key counter and return
 * the current count plus the reset timestamp.
 *
 * @example
 * class MyStorage implements ThrottlerStorage {
 *   async increment(key, ttlMs) {
 *     // ...
 *     return { count, resetAt }
 *   }
 * }
 */
export interface ThrottlerStorage {
  /**
   * Increment the counter for `key`. The counter expires `ttlMs`
   * milliseconds after the **first** increment in a window.
   *
   * @param key - Composite key (route + client identifier).
   * @param ttlMs - Window duration in milliseconds.
   * @returns The current count and the Unix-ms timestamp when the counter
   *   will reset.
   */
  increment(
    key: string,
    ttlMs: number,
  ): Promise<{ count: number; resetAt: number }>
}
