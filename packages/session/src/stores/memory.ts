import type { SessionData, SessionStore } from '../types'

interface MemoryEntry {
  data: SessionData
  expiresAt: number
}

/**
 * In-memory session store backed by a `Map`.
 *
 * Expired entries are removed lazily on access. This store is suitable for
 * development and testing. Use {@link RedisSessionStore} (or a custom
 * {@link SessionStore}) for production deployments.
 *
 * @example
 * SessionModule.forRoot({
 *   secret: 'my-secret',
 *   store: new MemorySessionStore(),
 * })
 */
export class MemorySessionStore implements SessionStore {
  private readonly map = new Map<string, MemoryEntry>()

  /**
   * Load session data by id. Returns `null` if missing or expired.
   *
   * @param id - Session id.
   */
  async get(id: string): Promise<SessionData | null> {
    const entry = this.map.get(id)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.map.delete(id)
      return null
    }
    return entry.data
  }

  /**
   * Persist session data with a TTL.
   *
   * @param id - Session id.
   * @param data - Session payload.
   * @param ttlSeconds - Time-to-live in seconds.
   */
  async set(id: string, data: SessionData, ttlSeconds: number): Promise<void> {
    this.map.set(id, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  /**
   * Delete session data.
   *
   * @param id - Session id.
   */
  async destroy(id: string): Promise<void> {
    this.map.delete(id)
  }
}
