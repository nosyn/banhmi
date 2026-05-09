import { BetterAuthGuard, getBetterAuthSession } from '@banhmi/better-auth'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, UseGuards } from 'banhmi'

@Controller('/users')
export class UsersController {
  static inject = [] as const

  @Get('/ping')
  ping() {
    return { message: 'pong', timestamp: Date.now() }
  }

  /**
   * Returns the authenticated user from the better-auth session.
   *
   * Protected by `BetterAuthGuard` — validates the session cookie against
   * the better-auth `get-session` endpoint. Returns 401 if no valid session.
   */
  @Get('/me')
  @UseGuards(BetterAuthGuard)
  getMe(ctx: RouteCtx) {
    const session = getBetterAuthSession(ctx)
    return { user: session?.user ?? null }
  }
}
