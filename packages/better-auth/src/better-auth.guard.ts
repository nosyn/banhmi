import {
  type ExecutionContext,
  type Guard,
  Injectable,
  UnauthorizedException,
} from '@banhmi/common'
import type { BetterAuthSessionData } from './types'

/**
 * Module-level singleton: the configured session client.
 * Set by `BetterAuthModule.forRoot()` when the module is initialized.
 * `BetterAuthGuard` reads from here at request time.
 *
 * @internal
 */
let _configuredClient: {
  getSession(req: Request): Promise<BetterAuthSessionData | null>
} | null = null

/**
 * Registers the session client used by `BetterAuthGuard`.
 * Called by `BetterAuthModule.forRoot()` during module initialization.
 *
 * @internal
 */
export function _registerBetterAuthClient(client: {
  getSession(req: Request): Promise<BetterAuthSessionData | null>
}): void {
  _configuredClient = client
}

/**
 * Guard that validates a request against the better-auth session endpoint.
 *
 * Apply with `@UseGuards(BetterAuthGuard)` on a controller or handler to
 * require a valid better-auth session. On success the session data is stored
 * on `ctx.state['banhmi:better-auth:session']` for downstream use.
 *
 * **Requires** `BetterAuthModule.forRoot({ url })` to be imported in your
 * app module before the guard will have a configured session client.
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
 *     const session = getBetterAuthSession(ctx)
 *     return { user: session?.user }
 *   }
 * }
 */
@Injectable()
export class BetterAuthGuard implements Guard {
  static inject = [] as const

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!_configuredClient) {
      throw new Error(
        'BetterAuthGuard: no session client configured. ' +
          'Import BetterAuthModule.forRoot({ url: "..." }) in your AppModule.',
      )
    }
    const ctx = context.getCtx()
    const session = await _configuredClient.getSession(ctx.request)
    if (!session) {
      throw new UnauthorizedException('No valid better-auth session')
    }
    ctx.state['banhmi:better-auth:session'] = session
    return true
  }
}
