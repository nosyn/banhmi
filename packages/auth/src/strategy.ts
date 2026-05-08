import type { RouteCtx } from '@banhmi/common'

/**
 * Base class for all authentication strategies.
 *
 * A Strategy authenticates a request and returns the authenticated principal,
 * or `null` if authentication fails. Implement `name` and `authenticate` in
 * every concrete subclass.
 *
 * @typeParam TUser - The shape of the authenticated principal.
 *
 * @example
 * class MyStrategy extends Strategy<{ id: string }> {
 *   name = 'mine'
 *   async authenticate(req: Request, ctx: RouteCtx) {
 *     const id = req.headers.get('x-user')
 *     return id ? { id } : null
 *   }
 * }
 */
export abstract class Strategy<TUser = unknown> {
  /** Unique strategy identifier used with `@UseAuth(name)`. */
  abstract name: string

  /**
   * Attempt to authenticate the incoming request.
   *
   * @param req - The raw `Request` object.
   * @param ctx - The route context for the current request.
   * @returns The authenticated principal, or `null` on failure.
   */
  abstract authenticate(req: Request, ctx: RouteCtx): Promise<TUser | null>
}
