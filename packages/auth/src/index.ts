/**
 * @banhmi/auth — Strategy-based authentication for Banhmi applications.
 *
 * Provides a pluggable strategy abstraction with built-in support for:
 * - `LocalStrategy` — username/password (JSON or form body)
 * - `JwtStrategy` — JWT Bearer token (HS256 via `@banhmi/jwt`)
 * - `GoogleStrategy` — OAuth 2.0 authorization-code (Google)
 * - `GitHubStrategy` — OAuth 2.0 authorization-code (GitHub)
 * - `BetterAuthStrategy` — bridge to a better-auth session endpoint
 *
 * Use `@UseAuth(strategyName, strategies)` on a handler to enforce
 * authentication. Retrieve the principal with `getAuthUser(ctx)`.
 *
 * @example
 * import { LocalStrategy, UseAuth, getAuthUser } from '@banhmi/auth'
 *
 * const local = new LocalStrategy({
 *   validate: async ({ username, password }) => {
 *     const user = await db.findUser(username)
 *     if (!user || !(await verifyPassword(password, user.hash))) return null
 *     return user
 *   },
 * })
 *
 * \@Controller()
 * class AuthController {
 *   \@Post('/login')
 *   \@UseAuth('local', [local])
 *   login(ctx: RouteCtx) {
 *     return { user: getAuthUser(ctx) }
 *   }
 * }
 */

export { AuthModule } from './auth.module'
export { AuthUser, getAuthUser, UseAuth } from './decorators'
export { BetterAuthStrategy } from './strategies/better-auth'
export { GitHubStrategy } from './strategies/github'
export { GoogleStrategy } from './strategies/google'
export { bearerToken, JwtStrategy } from './strategies/jwt'
export { LocalStrategy } from './strategies/local'
export { Strategy } from './strategy'
export { AUTH_STRATEGIES } from './tokens'
export type {
  AuthenticatedRequest,
  AuthOptions,
  OAuthProfile,
  StrategyName,
} from './types'
