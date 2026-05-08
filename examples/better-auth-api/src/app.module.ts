import { SecurityModule } from '@banhmi/security'
import { ThrottlerModule } from '@banhmi/throttler'
import { Module } from 'banhmi'
import { LegacyModule } from './legacy/legacy.module'
import { ProfileModule } from './profile/profile.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
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
