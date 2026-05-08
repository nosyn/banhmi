import type { RouteCtx } from '@banhmi/common'
import { parseCookies } from '@banhmi/cookies'
import { Strategy } from '../strategy'

/**
 * Options for {@link BetterAuthStrategy}.
 */
export type BetterAuthStrategyOptions = {
  /**
   * Base URL of the better-auth instance (e.g., `http://localhost:3000`).
   * The strategy calls `<url>/api/auth/get-session` to validate the session.
   */
  url: string
  /**
   * Name of the session cookie set by better-auth.
   * @default 'better-auth.session_token'
   */
  cookieName?: string
}

/**
 * Bridge strategy for better-auth. Reads the session cookie from the incoming
 * request, calls the better-auth `get-session` API endpoint, and returns the
 * session user or `null`.
 *
 * Useful when a Banhmi service shares a better-auth instance running on a
 * separate origin or mounted on the same host.
 *
 * > **TODO (Wave 6):** Full integration including server-side session
 * > invalidation callbacks and direct better-auth client wiring. Current
 * > implementation performs an HTTP round-trip to the session endpoint.
 *
 * @example
 * new BetterAuthStrategy({
 *   url: 'http://localhost:3001',
 *   cookieName: 'better-auth.session_token',
 * })
 */
export class BetterAuthStrategy extends Strategy<unknown> {
  readonly name = 'better-auth'

  private readonly url: string
  private readonly cookieName: string

  constructor(opts: BetterAuthStrategyOptions) {
    super()
    this.url = opts.url.replace(/\/$/, '')
    this.cookieName = opts.cookieName ?? 'better-auth.session_token'
  }

  /**
   * Authenticate the request by forwarding the session cookie to the
   * better-auth `get-session` endpoint.
   *
   * @param req - The incoming request.
   * @param _ctx - The route context (unused).
   * @returns The session user object, or `null` if the session is invalid.
   *
   * @example
   * const user = await strategy.authenticate(req, ctx)
   */
  async authenticate(req: Request, _ctx: RouteCtx): Promise<unknown> {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const cookies = parseCookies(cookieHeader)
    const sessionToken = cookies[this.cookieName]

    if (!sessionToken) return null

    try {
      const res = await fetch(`${this.url}/api/auth/get-session`, {
        headers: {
          cookie: `${this.cookieName}=${sessionToken}`,
        },
      })

      if (!res.ok) return null

      const data = (await res.json()) as Record<string, unknown> | null
      if (!data) return null

      // better-auth returns { session, user }; we expose the user sub-object
      // when present, otherwise the entire response body.
      return (data.user as unknown) ?? data
    } catch {
      return null
    }
  }
}
