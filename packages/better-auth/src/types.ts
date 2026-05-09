/**
 * Options for {@link BetterAuthModule}.
 */
export interface BetterAuthOptions {
  /**
   * Base URL of the better-auth instance (e.g., `http://localhost:3001`).
   * The guard calls `<url>/api/auth/get-session` to validate the session.
   */
  url: string
  /**
   * Name of the session cookie set by better-auth.
   * @default 'better-auth.session_token'
   */
  cookieName?: string
}

/**
 * Shape of the session data returned by the better-auth `get-session` endpoint.
 */
export interface BetterAuthSessionData {
  /** The session object from better-auth. */
  session: {
    id: string
    userId: string
    expiresAt: string
    [key: string]: unknown
  }
  /** The authenticated user from better-auth. */
  user: {
    id: string
    email: string
    name?: string
    [key: string]: unknown
  }
}
