/**
 * Arbitrary session payload — any JSON-serialisable key/value pairs.
 *
 * @example
 * const data: SessionData = { userId: 'u-123', role: 'admin' }
 */
export type SessionData = Record<string, unknown>

/**
 * Session store interface.
 *
 * Implement this interface to provide a custom session backend
 * (e.g. Redis, SQLite, DynamoDB).
 *
 * @example
 * class MyStore implements SessionStore {
 *   async get(id: string) { ... }
 *   async set(id: string, data: SessionData, ttl: number) { ... }
 *   async destroy(id: string) { ... }
 * }
 */
export interface SessionStore {
  /**
   * Load session data by id.
   *
   * @param id - Session id.
   * @returns The session data, or `null` if not found / expired.
   */
  get(id: string): Promise<SessionData | null>
  /**
   * Persist session data.
   *
   * @param id - Session id.
   * @param data - Session payload.
   * @param ttlSeconds - Time-to-live in seconds.
   */
  set(id: string, data: SessionData, ttlSeconds: number): Promise<void>
  /**
   * Delete session data.
   *
   * @param id - Session id.
   */
  destroy(id: string): Promise<void>
}

/**
 * Configuration options for {@link SessionModule.forRoot}.
 *
 * @example
 * SessionModule.forRoot({
 *   secret: 'my-signing-secret',
 *   cookie: { maxAge: 3600, secure: true },
 * })
 */
export type SessionOptions = {
  /**
   * Session store implementation.
   *
   * Defaults to an in-memory {@link MemorySessionStore}.
   */
  store?: SessionStore
  /**
   * HMAC-SHA256 secret used to sign and verify the session-id cookie.
   * Required.
   */
  secret: string
  /**
   * Cookie settings.
   */
  cookie?: {
    /**
     * Cookie name.
     *
     * @default 'banhmi.sid'
     */
    name?: string
    /**
     * Cookie max-age in seconds.
     *
     * @default 86400
     */
    maxAge?: number
    /**
     * Set the `Secure` flag (https-only).
     *
     * @default false
     */
    secure?: boolean
    /**
     * SameSite policy.
     *
     * @default 'lax'
     */
    sameSite?: 'lax' | 'strict' | 'none'
    /**
     * Set the `HttpOnly` flag.
     *
     * @default true
     */
    httpOnly?: boolean
  }
}

/**
 * Live session reference injected by `@Session()`.
 *
 * Use this to read, write, regenerate, or destroy the current session.
 *
 * @example
 * \@Controller()
 * class CounterController {
 *   \@Get('/')
 *   \@Session()
 *   async index(ctx: RouteCtx) {
 *     const session = getSession(ctx)
 *     const count = (session.get<number>('count') ?? 0) + 1
 *     session.set('count', count)
 *     return { count }
 *   }
 * }
 */
export interface SessionRef {
  /** Current session id. */
  readonly id: string
  /**
   * Read a session value.
   *
   * @param key - Key to read.
   * @returns The stored value or `undefined`.
   */
  get<T>(key: string): T | undefined
  /**
   * Write a session value. Marks the session as dirty for persistence.
   *
   * @param key - Key to write.
   * @param value - JSON-serialisable value.
   */
  set(key: string, value: unknown): void
  /**
   * Delete all session data and schedule an expiry cookie on the next flush.
   */
  destroy(): Promise<void>
  /**
   * Generate a new session id, copy current data, delete the old session.
   */
  regenerate(): Promise<void>
}
