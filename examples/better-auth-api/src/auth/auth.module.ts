import { Module } from 'banhmi'
import { AuthService } from './auth.service'

/**
 * Provides the better-auth server instance (`AuthService`) that manages the
 * database-backed session store. Exported so `main.ts` can mount the
 * better-auth HTTP handler via `app.use()`.
 *
 * Note: Route-level session validation is handled by `BetterAuthGuard` from
 * `@banhmi/better-auth` — this module only manages the server-side client.
 */
@Module({
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
