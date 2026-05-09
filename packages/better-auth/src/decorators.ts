import type { RouteCtx } from '@banhmi/common'
import type { BetterAuthSessionData } from './types'

const SESSION_KEY = 'banhmi:better-auth:session'

/**
 * Retrieves the better-auth session from the route context.
 *
 * Returns `null` if the guard has not run or the session is not available.
 * This function is also useful on public endpoints where auth is optional —
 * use it instead of `@UseGuards(BetterAuthGuard)` to tolerate missing sessions.
 *
 * @example
 * \@Get('/me')
 * me(ctx: RouteCtx) {
 *   const session = getBetterAuthSession(ctx)
 *   if (!session) return { guest: true }
 *   return { user: session.user }
 * }
 */
export function getBetterAuthSession(
  ctx: RouteCtx,
): BetterAuthSessionData | null {
  const raw = ctx.state[SESSION_KEY]
  if (
    raw !== null &&
    raw !== undefined &&
    typeof raw === 'object' &&
    'user' in raw &&
    'session' in raw
  ) {
    return raw as BetterAuthSessionData
  }
  return null
}

/**
 * `@BetterAuthSession` — parameter decorator alias for retrieving the
 * better-auth session from `ctx.state`. Apply on a handler parameter that
 * corresponds to the route context.
 *
 * @example
 * \@Get('/me')
 * \@UseGuards(BetterAuthGuard)
 * me(@BetterAuthSession() ctx: RouteCtx) {
 *   const session = getBetterAuthSession(ctx)
 *   return session?.user
 * }
 */
// Convenience re-export so callers can destructure from one place.
export { getBetterAuthSession as BetterAuthSession }
