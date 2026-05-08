import type { Strategy } from './strategy'

/**
 * Options for {@link AuthModule.register}.
 *
 * @example
 * AuthModule.register({ strategies: [new LocalStrategy({ validate })] })
 */
export type AuthOptions = {
  /** List of strategy instances to register in DI. */
  strategies: Strategy[]
}

/**
 * The name of a registered authentication strategy.
 *
 * @example
 * const name: StrategyName = 'local'
 */
export type StrategyName = string

/**
 * A `Request`-like interface extended with the authenticated principal stored
 * in `ctx.state.user` after a successful `@UseAuth` authentication.
 *
 * @example
 * const user = getAuthUser(ctx) // typed as AuthenticatedRequest['user']
 */
export type AuthenticatedRequest = {
  /** The authenticated principal. Present only after `@UseAuth` succeeds. */
  user: unknown
}

/**
 * Normalised OAuth 2.0 user profile returned by {@link GoogleStrategy} and
 * {@link GitHubStrategy} after a successful authorization-code exchange.
 *
 * @example
 * const profile: OAuthProfile = {
 *   provider: 'google',
 *   id: '123',
 *   email: 'user@example.com',
 *   name: 'Alice',
 *   raw: { ... }
 * }
 */
export type OAuthProfile = {
  /** OAuth provider identifier, e.g. `'google'` or `'github'`. */
  provider: 'google' | 'github' | string
  /** Provider-specific user ID. */
  id: string
  /** Primary email address, if provided by the provider. */
  email?: string
  /** Display name, if provided by the provider. */
  name?: string
  /** The raw user-info response from the provider. */
  raw: unknown
}
