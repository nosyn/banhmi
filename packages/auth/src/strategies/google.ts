import type { RouteCtx } from '@banhmi/common'
import { OAuthClient } from '../oauth/oauth-client'
import { Strategy } from '../strategy'
import type { OAuthProfile } from '../types'

/**
 * Options for {@link GoogleStrategy}.
 */
export type GoogleStrategyOptions = {
  /** Google OAuth 2.0 client ID. */
  clientId: string
  /** Google OAuth 2.0 client secret. */
  clientSecret: string
  /** Registered redirect URI (must match Google Console config). */
  redirectUri: string
  /**
   * Secret for signing/verifying the `state` parameter.
   * @default Bun.env.BANHMI_OAUTH_STATE_SECRET
   */
  stateSecret?: string
  /**
   * OAuth scopes to request.
   * @default ['openid', 'email', 'profile']
   */
  scopes?: string[]
  /**
   * Validate/transform the raw OAuth profile into your application's user
   * shape. Return `null` to reject the login.
   *
   * When omitted, the raw {@link OAuthProfile} is returned as-is.
   */
  validate?: (profile: OAuthProfile) => Promise<unknown>
}

/**
 * Google OAuth 2.0 authentication strategy.
 *
 * Use `getAuthorizationUrl()` to obtain the provider redirect URL and
 * `handleCallback(code, state)` to complete the authorization-code exchange.
 *
 * `authenticate` reads `code` and `state` from the request's query string
 * (suitable for mounting on a callback route).
 *
 * @example
 * const google = new GoogleStrategy({
 *   clientId: Bun.env.GOOGLE_CLIENT_ID!,
 *   clientSecret: Bun.env.GOOGLE_CLIENT_SECRET!,
 *   redirectUri: 'https://example.com/auth/google/callback',
 *   validate: async (profile) => db.upsertUser(profile),
 * })
 *
 * // Redirect to Google
 * const url = await google.getAuthorizationUrl()
 *
 * // On callback route
 * const user = await google.authenticate(req, ctx)
 */
export class GoogleStrategy extends Strategy<unknown> {
  readonly name = 'google'

  private readonly client: OAuthClient
  private readonly validateFn:
    | ((profile: OAuthProfile) => Promise<unknown>)
    | undefined

  constructor(opts: GoogleStrategyOptions) {
    super()
    this.validateFn = opts.validate
    this.client = new OAuthClient({
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      redirectUri: opts.redirectUri,
      stateSecret: opts.stateSecret,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scopes: opts.scopes ?? ['openid', 'email', 'profile'],
      provider: 'google',
    })
  }

  /**
   * Build the Google authorization URL with a signed `state` parameter.
   *
   * @returns The full redirect URL to send the user to.
   *
   * @example
   * const url = await strategy.getAuthorizationUrl()
   * return Response.redirect(url)
   */
  getAuthorizationUrl(): Promise<string> {
    return this.client.getAuthorizationUrl()
  }

  /**
   * Complete the authorization-code flow.
   *
   * Reads `code` and `state` from the request query string, verifies the
   * state signature, exchanges the code for an access token, fetches the
   * user profile, and calls `validate` if provided.
   *
   * @param req - The callback request from Google.
   * @param _ctx - The route context (unused).
   * @returns The validated user principal, or `null` on any failure.
   *
   * @example
   * const user = await google.authenticate(req, ctx)
   * if (!user) return new Response('Unauthorized', { status: 401 })
   */
  async authenticate(req: Request, _ctx: RouteCtx): Promise<unknown> {
    try {
      const url = new URL(req.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (!code || !state) return null

      const profile = await this.client.handleCallback(code, state)

      if (this.validateFn) {
        return this.validateFn(profile)
      }
      return profile
    } catch {
      return null
    }
  }

  /**
   * Exchange an authorization code and state for a profile directly.
   * Useful when `code` and `state` are extracted outside the strategy.
   *
   * @param code - Authorization code from the provider.
   * @param state - Signed state parameter from the provider.
   * @returns The normalised OAuth profile.
   * @throws {Error} When the state is invalid.
   *
   * @example
   * const profile = await strategy.handleCallback(code, state)
   */
  handleCallback(code: string, state: string): Promise<OAuthProfile> {
    return this.client.handleCallback(code, state)
  }
}
