/**
 * Demo: @banhmi/better-auth — end-to-end better-auth plugin.
 *
 * GET /me    — protected; requires a valid better-auth session cookie.
 * GET /ping  — public; optionally reads session if present.
 *
 * In production you run a better-auth server (or mount it via app.use())
 * and point BetterAuthModule at its URL. Here the client is mocked in tests.
 */
import {
  BetterAuthGuard,
  BetterAuthModule,
  getBetterAuthSession,
} from '@banhmi/better-auth'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module, UseGuards } from 'banhmi'

export const BETTER_AUTH_URL =
  Bun.env.BETTER_AUTH_URL ?? 'http://localhost:3001'

@Controller()
export class AppController {
  @Get('/me')
  @UseGuards(BetterAuthGuard)
  me(ctx: RouteCtx) {
    const session = getBetterAuthSession(ctx)
    return { user: session?.user ?? null }
  }

  @Get('/ping')
  ping(ctx: RouteCtx) {
    // Optional auth: returns session info when available, still serves guests.
    const session = getBetterAuthSession(ctx)
    return { ok: true, loggedIn: session !== null }
  }
}

@Module({
  imports: [
    BetterAuthModule.forRoot({
      url: BETTER_AUTH_URL,
      cookieName: 'better-auth.session_token',
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
