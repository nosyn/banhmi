import { signValue, verifyValue } from '@banhmi/cookies'
import { randomToken } from '@banhmi/crypto'
import type { OAuthProfile } from '../types'

/**
 * Configuration for an OAuth 2.0 authorization-code client.
 */
export type OAuthClientOptions = {
  /** Client ID registered with the provider. */
  clientId: string
  /** Client secret registered with the provider. */
  clientSecret: string
  /** The callback URL registered with the provider. */
  redirectUri: string
  /**
   * Secret used to HMAC-sign the `state` parameter. Prevents CSRF on the
   * OAuth callback. Defaults to `Bun.env.BANHMI_OAUTH_STATE_SECRET`.
   */
  stateSecret?: string
  /** Authorization endpoint URL. */
  authorizationUrl: string
  /** Token exchange endpoint URL. */
  tokenUrl: string
  /** User-info endpoint URL. */
  userInfoUrl: string
  /** OAuth scopes to request. */
  scopes: string[]
  /** Provider name written into the resulting {@link OAuthProfile}. */
  provider: string
}

/**
 * Token response from the provider's token endpoint.
 * @internal
 */
type TokenResponse = {
  access_token: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

/**
 * Shared OAuth 2.0 authorization-code helper used by {@link GoogleStrategy}
 * and {@link GitHubStrategy}. Handles state generation/verification, code
 * exchange, and user-info fetching.
 *
 * @example
 * const client = new OAuthClient({
 *   clientId: '...',
 *   clientSecret: '...',
 *   redirectUri: 'https://example.com/auth/google/callback',
 *   authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
 *   tokenUrl: 'https://oauth2.googleapis.com/token',
 *   userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
 *   scopes: ['openid', 'email', 'profile'],
 *   provider: 'google',
 * })
 * const url = await client.getAuthorizationUrl()
 * const profile = await client.handleCallback(code, state)
 */
export class OAuthClient {
  private readonly stateSecret: string

  constructor(private readonly opts: OAuthClientOptions) {
    this.stateSecret =
      opts.stateSecret ??
      Bun.env.BANHMI_OAUTH_STATE_SECRET ??
      'oauth-state-secret'
  }

  /**
   * Build the provider authorization URL with a signed `state` parameter.
   *
   * @returns The full redirect URL to send the user to.
   *
   * @example
   * const url = await client.getAuthorizationUrl()
   * return Response.redirect(url)
   */
  async getAuthorizationUrl(): Promise<string> {
    const nonce = randomToken(16)
    const signedState = await signValue(nonce, this.stateSecret)

    const params = new URLSearchParams({
      client_id: this.opts.clientId,
      redirect_uri: this.opts.redirectUri,
      response_type: 'code',
      scope: this.opts.scopes.join(' '),
      state: signedState,
    })

    return `${this.opts.authorizationUrl}?${params.toString()}`
  }

  /**
   * Handle the OAuth callback: verify the `state`, exchange the `code` for
   * an access token, fetch user info, and return a normalised {@link OAuthProfile}.
   *
   * @param code - The `code` query parameter from the callback URL.
   * @param state - The `state` query parameter from the callback URL.
   * @returns The normalised OAuth profile.
   * @throws {Error} When the `state` is invalid/tampered.
   *
   * @example
   * const profile = await client.handleCallback(
   *   url.searchParams.get('code')!,
   *   url.searchParams.get('state')!,
   * )
   */
  async handleCallback(code: string, state: string): Promise<OAuthProfile> {
    const verified = await verifyValue(state, this.stateSecret)
    if (verified === null) {
      throw new Error(
        'OAuth state parameter is invalid or has been tampered with',
      )
    }

    const accessToken = await this.exchangeCode(code)
    const userInfo = await this.fetchUserInfo(accessToken)

    return this.normalizeProfile(userInfo)
  }

  /**
   * Exchange an authorization code for an access token.
   * @internal
   */
  private async exchangeCode(code: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.opts.clientId,
      client_secret: this.opts.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.opts.redirectUri,
    })

    const res = await fetch(this.opts.tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${res.status} ${res.statusText}`)
    }

    const data = (await res.json()) as TokenResponse
    return data.access_token
  }

  /**
   * Fetch user info from the provider using the access token.
   * @internal
   */
  private async fetchUserInfo(
    accessToken: string,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(this.opts.userInfoUrl, {
      headers: { authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      throw new Error(`User info fetch failed: ${res.status} ${res.statusText}`)
    }

    return (await res.json()) as Record<string, unknown>
  }

  /**
   * Normalise provider-specific user-info into an {@link OAuthProfile}.
   * Override in subclasses for provider-specific field mapping.
   * @internal
   */
  normalizeProfile(raw: Record<string, unknown>): OAuthProfile {
    const id = String(raw.id ?? raw.sub ?? '')
    const email = typeof raw.email === 'string' ? raw.email : undefined
    const name =
      typeof raw.name === 'string'
        ? raw.name
        : typeof raw.login === 'string'
          ? raw.login
          : undefined

    return { provider: this.opts.provider, id, email, name, raw }
  }
}
