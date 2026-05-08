import type { RouteCtx } from '@banhmi/common'
import type { Strategy } from './strategy'
import { AUTH_USER_STATE_KEY } from './tokens'

type Handler = (ctx: RouteCtx, ...args: unknown[]) => unknown

/**
 * Method decorator that enforces authentication on the decorated handler.
 *
 * Before the handler runs, the named strategy is resolved from the provided
 * `strategies` array and called. On success, the authenticated principal is
 * stored at `ctx.state['banhmi:auth:user']` and the handler runs normally.
 * On failure (strategy returns `null`) a `401 Unauthorized` response is
 * returned immediately.
 *
 * Use {@link getAuthUser} inside the handler to retrieve the principal.
 *
 * > **Note:** For DI-integrated use, pair with `AuthModule.register` and the
 * > `AUTH_STRATEGIES` token. For standalone use (e.g., tests), pass the
 * > strategies array directly to `@UseAuth`.
 *
 * @param strategyName - The `name` of the strategy to run.
 * @param strategies - Strategy instances. In a DI application these are
 *   injected at construction time; pass them explicitly in test scenarios.
 *
 * @example
 * \@Controller()
 * class AppController {
 *   constructor(private readonly strategies: Strategy[]) {}
 *
 *   \@Post('/login')
 *   \@UseAuth('local', strategies)
 *   login(ctx: RouteCtx) {
 *     const user = getAuthUser(ctx)
 *     return { user }
 *   }
 * }
 */
export function UseAuth(strategyName: string, strategies: Strategy[] = []) {
  return (
    original: Handler,
    _context: ClassMethodDecoratorContext,
  ): Handler => {
    return async function (this: unknown, ctx: RouteCtx, ...rest: unknown[]) {
      const strategy = strategies.find((s) => s.name === strategyName)

      if (!strategy) {
        return new Response(
          JSON.stringify({
            message: `Authentication strategy '${strategyName}' not found`,
            statusCode: 500,
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        )
      }

      const user = await strategy.authenticate(ctx.request, ctx)

      if (user === null) {
        return new Response(
          JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          {
            status: 401,
            headers: { 'content-type': 'application/json' },
          },
        )
      }

      ctx.state[AUTH_USER_STATE_KEY] = user
      return original.call(this, ctx, ...rest)
    }
  }
}

/**
 * Method decorator that documents intent: the handler requires an
 * authenticated principal (set by `@UseAuth`). This decorator is a no-op
 * at runtime — use {@link getAuthUser} to retrieve the principal.
 *
 * For full principal injection, combine with `@UseAuth` which sets
 * `ctx.state['banhmi:auth:user']` before the handler runs.
 *
 * @example
 * \@Get('/me')
 * \@UseAuth('jwt', strategies)
 * \@AuthUser()
 * me(ctx: RouteCtx) {
 *   const user = getAuthUser(ctx)
 *   return { user }
 * }
 */
export function AuthUser() {
  return (_original: Handler, _context: ClassMethodDecoratorContext): void => {
    // Intentional no-op: serves as documentation that the handler relies on
    // an authenticated user. The principal is accessed via getAuthUser(ctx).
  }
}

/**
 * Retrieve the authenticated principal stored by `@UseAuth` from `ctx.state`.
 *
 * Returns `null` if `@UseAuth` was not applied or authentication was skipped.
 *
 * @param ctx - The route context.
 * @returns The authenticated principal cast to `TUser`, or `null`.
 *
 * @example
 * const user = getAuthUser<{ id: string }>(ctx)
 * if (!user) return new Response('Unauthorized', { status: 401 })
 * return { id: user.id }
 */
export function getAuthUser<TUser = unknown>(ctx: RouteCtx): TUser | null {
  const val = ctx.state[AUTH_USER_STATE_KEY]
  if (val === undefined) return null
  return val as TUser
}
