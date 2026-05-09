import { BetterAuthModule } from '@banhmi/better-auth'
import { SecurityModule } from '@banhmi/security'
import { ThrottlerModule } from '@banhmi/throttler'
import { Module } from 'banhmi'
import { LegacyModule } from './legacy/legacy.module'
import { ProfileModule } from './profile/profile.module'
import { UsersModule } from './users/users.module'

// The better-auth server is mounted on the same host via app.use() in main.ts.
// We point the plugin client at the app's own URL so BetterAuthGuard can
// validate sessions against the running better-auth instance.
const BETTER_AUTH_URL = Bun.env.BETTER_AUTH_URL ?? 'http://localhost:3001'

@Module({
  imports: [
    BetterAuthModule.forRoot({
      url: BETTER_AUTH_URL,
      cookieName: 'better-auth.session_token',
    }),
    SecurityModule.forRoot({
      helmet: {},
      cors: { origin: 'http://localhost:3000', credentials: true },
      // CSRF is scoped to non-better-auth routes via the middleware's own
      // path check: better-auth handles /api/auth/** internally before the
      // framework middleware chain runs (see main.ts use() guard).
      csrf: {},
    }),
    ThrottlerModule.forRoot({ ttl: 60_000, limit: 30 }),
    LegacyModule,
    ProfileModule,
    UsersModule,
  ],
})
export class AppModule {}
