/**
 * @banhmi/better-auth — end-to-end better-auth integration for Banhmi.
 *
 * Provides a `BetterAuthModule` (registered via `forRoot`) that wires a
 * thin session client and a `BetterAuthGuard` into the DI container.
 *
 * This is an alternative to `@banhmi/auth`'s strategy-based approach:
 * - `@banhmi/auth` — Passport-style; compose strategies (Local, JWT, OAuth).
 * - `@banhmi/better-auth` — end-to-end; better-auth owns sessions, providers, RBAC.
 *
 * @example
 * import { BetterAuthModule, BetterAuthGuard, getBetterAuthSession } from '@banhmi/better-auth'
 *
 * \@Module({
 *   imports: [
 *     BetterAuthModule.forRoot({ url: 'http://localhost:3001' }),
 *   ],
 * })
 * class AppModule {}
 *
 * \@Controller('/users')
 * class UsersController {
 *   \@Get('/me')
 *   \@UseGuards(BetterAuthGuard)
 *   me(ctx: RouteCtx) {
 *     return { user: getBetterAuthSession(ctx)?.user }
 *   }
 * }
 */

export { BetterAuthGuard } from './better-auth.guard'
export { BetterAuthModule } from './better-auth.module'
export { BetterAuthSession, getBetterAuthSession } from './decorators'
export { BETTER_AUTH_CLIENT, BETTER_AUTH_OPTIONS } from './tokens'
export type { BetterAuthOptions, BetterAuthSessionData } from './types'
