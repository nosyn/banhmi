import type { RouteCtx } from '@banhmi/common'
import { initSession } from './session.middleware'
import { MemorySessionStore } from './stores/memory'
import type { SessionOptions } from './types'

type Handler = (ctx: RouteCtx, ...args: unknown[]) => unknown

/**
 * Method decorator that initialises the server-side session for the current
 * request. Loads an existing session from the store (if a valid signed cookie
 * is present) or creates a new one. After the handler returns, flushes dirty
 * sessions to the store and appends a `Set-Cookie` header when the session id
 * was created or changed.
 *
 * Use {@link getSession} inside the handler to read and write session data.
 *
 * The store is created **once** at class-definition time (when the decorator
 * runs), not per-request, so the same `MemorySessionStore` instance is reused
 * across all requests to this handler.
 *
 * @param opts - Session configuration. Must include `secret`. When used with
 *   `SessionModule.forRoot()`, pass the same options here or rely on the
 *   module-registered token.
 *
 * @example
 * \@Controller()
 * class CounterController {
 *   \@Get('/')
 *   \@Session({ secret: 'my-secret' })
 *   async index(ctx: RouteCtx) {
 *     const session = getSession(ctx)
 *     const count = (session.get<number>('count') ?? 0) + 1
 *     session.set('count', count)
 *     return { count }
 *   }
 * }
 */
export function Session(opts: SessionOptions) {
  // Resolve the store once so all requests share the same instance.
  const resolvedOpts: SessionOptions = {
    ...opts,
    store: opts.store ?? new MemorySessionStore(),
  }

  return (
    original: Handler,
    _context: ClassMethodDecoratorContext,
  ): Handler => {
    return async function (this: unknown, ctx: RouteCtx, ...rest: unknown[]) {
      const flush = await initSession(ctx, resolvedOpts)

      const result = await original.call(this, ctx, ...rest)

      // Serialise the handler result to a Response before flushing
      let response: Response
      if (result instanceof Response) {
        response = result
      } else if (result === undefined || result === null) {
        response = new Response(null, { status: 204 })
      } else {
        response = Response.json(result)
      }

      return flush(response)
    }
  }
}
