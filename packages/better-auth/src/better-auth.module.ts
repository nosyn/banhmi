import { Module } from '@banhmi/common'
import { parseCookies } from '@banhmi/cookies'
import { _registerBetterAuthClient, BetterAuthGuard } from './better-auth.guard'
import { BETTER_AUTH_CLIENT, BETTER_AUTH_OPTIONS } from './tokens'
import type { BetterAuthOptions, BetterAuthSessionData } from './types'

/**
 * Registers the better-auth plugin into the Banhmi DI container.
 *
 * Provides:
 * - `BETTER_AUTH_OPTIONS` — the raw options passed to `forRoot`.
 * - `BETTER_AUTH_CLIENT` — a thin fetch-based session client.
 * - `BetterAuthGuard` — a guard that validates requests against the
 *   better-auth `get-session` endpoint.
 *
 * Also configures the module-level singleton client used by
 * `BetterAuthGuard` when applied via `@UseGuards(BetterAuthGuard)`.
 *
 * @example
 * \@Module({
 *   imports: [
 *     BetterAuthModule.forRoot({
 *       url: 'http://localhost:3001',
 *       cookieName: 'better-auth.session_token',
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class BetterAuthModule {
  static forRoot(options: BetterAuthOptions) {
    const url = options.url.replace(/\/$/, '')
    const cookieName = options.cookieName ?? 'better-auth.session_token'

    const client = {
      async getSession(req: Request): Promise<BetterAuthSessionData | null> {
        const cookieHeader = req.headers.get('cookie') ?? ''
        const cookies = parseCookies(cookieHeader)
        const sessionToken = cookies[cookieName]

        if (!sessionToken) return null

        try {
          const res = await fetch(`${url}/api/auth/get-session`, {
            headers: {
              cookie: `${cookieName}=${sessionToken}`,
            },
          })

          if (!res.ok) return null

          const data = (await res.json()) as Record<string, unknown> | null
          if (!data || typeof data !== 'object') return null

          const { session, user } = data
          if (!session || !user) return null

          return data as BetterAuthSessionData
        } catch {
          return null
        }
      },
    }

    // Register the client singleton so BetterAuthGuard.canActivate() can use it
    // when instantiated via `new BetterAuthGuard()` (i.e. @UseGuards).
    _registerBetterAuthClient(client)

    @Module({
      providers: [
        { provide: BETTER_AUTH_OPTIONS, useValue: options },
        {
          provide: BETTER_AUTH_CLIENT,
          useFactory: () => client,
        },
        BetterAuthGuard,
      ],
      exports: [BETTER_AUTH_CLIENT, BetterAuthGuard],
    })
    class BetterAuthRootModule {}

    return BetterAuthRootModule
  }
}
