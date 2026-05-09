/**
 * Minimal contract for a Redis client used by the Banhmi framework.
 *
 * Implemented by `Bun.RedisClient` (via {@link createRedisClient}) and by
 * in-memory fakes in tests. All framework packages depend on this interface,
 * not on any concrete Redis library.
 *
 * @example
 * // Production — backed by Bun.RedisClient:
 * import { createRedisClient } from '@banhmi/redis'
 * const client: RedisLike = createRedisClient('redis://localhost:6379')
 *
 * @example
 * // Tests — in-memory fake:
 * const fake: RedisLike = makeRedisLike()
 */
export interface RedisLike {
  /** Get a string value by key. Returns `null` if the key does not exist. */
  get(key: string): Promise<string | null>

  /**
   * Set a string value. Optionally expire after `ttlSeconds` seconds.
   *
   * @param key - Redis key.
   * @param value - String value to store.
   * @param ttlSeconds - Optional TTL in seconds (`EX`).
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<unknown>

  /** Delete one key. Returns the number of keys removed. */
  del(key: string): Promise<number>

  /**
   * Set a key's TTL in seconds. Returns 1 if set, 0 if the key doesn't exist.
   */
  expire(key: string, seconds: number): Promise<number>

  /**
   * Set a key's TTL in milliseconds. Returns 1 if set, 0 if the key doesn't
   * exist.
   *
   * The optional `nx` flag means "set only if the key has no expiry yet",
   * which is used for atomic sliding-window counters.
   */
  pexpire(key: string, ms: number, nx?: 'NX'): Promise<number>

  /**
   * Get the remaining TTL for a key in milliseconds. Returns -2 if the key
   * does not exist, -1 if it has no TTL.
   */
  pttl(key: string): Promise<number>

  /** Atomically increment a key by 1 and return the new value. */
  incr(key: string): Promise<number>

  /** Publish a message to a Redis channel. */
  publish(channel: string, message: string): Promise<number>

  /**
   * Subscribe to a channel. The `listener` is called for every message.
   *
   * Note: on `Bun.RedisClient` the client enters subscription mode and can
   * no longer execute regular commands — callers must use a dedicated
   * subscriber connection.
   */
  subscribe(channel: string, listener: (message: string) => void): void

  /**
   * Set multiple fields on a hash in one call.
   *
   * `fields` is a plain object mapping field names to string values.
   */
  hset(key: string, fields: Record<string, string>): Promise<number>

  /**
   * Get all fields of a hash. Returns an empty object when the key does not
   * exist (Bun.RedisClient behaviour; ioredis returns `null` — callers must
   * use `Object.keys(result).length === 0` to detect a missing key).
   */
  hgetall(key: string): Promise<Record<string, string>>

  /** Push one value onto the left end of a list. Returns the new list length. */
  lpush(key: string, value: string): Promise<number>

  /** Pop one value from the right end of a list. Returns `null` when empty. */
  rpop(key: string): Promise<string | null>

  /**
   * Add a member with a score to a sorted set.
   *
   * Signature matches both ioredis `zadd(key, score, member)` and Bun's
   * `zadd(key, ...args)` variadic form.
   */
  zadd(key: string, score: number, member: string): Promise<number>

  /**
   * Return all members of a sorted set whose score is between `min` and `max`
   * (inclusive). Use `'-inf'` / `'+inf'` for unbounded ranges.
   */
  zrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
  ): Promise<string[]>

  /** Remove a member from a sorted set. Returns the number of members removed. */
  zrem(key: string, member: string): Promise<number>

  /** Close the connection. */
  close(): void
}
