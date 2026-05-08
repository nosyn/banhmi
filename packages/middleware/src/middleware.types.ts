import type { RouteCtx } from '@banhmi/common'

/**
 * Functional middleware signature.
 *
 * Receives the raw `Request`, the current `RouteCtx`, and a `next` callback
 * that advances to the next middleware or (if none remain) to the rest of the
 * pipeline (guards → interceptors → handler → filters).
 *
 * Calling `next()` is optional — omitting it short-circuits the pipeline and
 * returns the middleware's own `Response` directly to the client.
 *
 * @example
 * const logger: MiddlewareFn = async (req, _ctx, next) => {
 *   console.log(req.method, req.url)
 *   return next()
 * }
 */
export type MiddlewareFn = (
  req: Request,
  ctx: RouteCtx,
  next: () => Promise<Response>,
) => Promise<Response>

/**
 * Class-based middleware interface.
 *
 * Implement this interface to create a DI-injectable middleware class.
 * The framework instantiates the class (optionally via the DI container)
 * and calls `use()` for each matching request.
 *
 * @example
 * class LoggerMiddleware implements BanhmiMiddleware {
 *   use: MiddlewareFn = async (req, _ctx, next) => {
 *     console.log(req.method, new URL(req.url).pathname)
 *     return next()
 *   }
 * }
 */
export interface BanhmiMiddleware {
  use: MiddlewareFn
}

/**
 * Describes a route or set of routes that a middleware applies to.
 *
 * - A plain `string` matches the path prefix (e.g. `'cats'` matches `/cats`
 *   and `/cats/123`).
 * - An object with `path` (and optional `method`) matches only the exact
 *   method + path prefix combination.
 *
 * @example
 * consumer.apply(LoggerMiddleware).forRoutes('cats')
 * consumer.apply(AuthMiddleware).forRoutes({ path: 'admin', method: 'ALL' })
 */
export type MiddlewareRoute =
  | string
  | {
      path: string
      method?:
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'DELETE'
        | 'OPTIONS'
        | 'HEAD'
        | 'ALL'
    }

/**
 * Constructor type for class-based middleware.
 */
export type MiddlewareClass = new () => BanhmiMiddleware

/**
 * A middleware that can be passed to `apply()` — either a functional
 * middleware or a class constructor.
 */
export type MiddlewareFnOrClass = MiddlewareFn | MiddlewareClass

/**
 * Fluent API for registering module-level middleware.
 *
 * Modules that implement `configure(consumer: MiddlewareConsumer)` use this
 * interface to bind middleware to specific routes.
 *
 * @example
 * class AppModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(LoggerMiddleware)
 *       .forRoutes('cats', 'dogs')
 *
 *     consumer
 *       .apply(AuthMiddleware)
 *       .forRoutes({ path: 'admin', method: 'ALL' })
 *   }
 * }
 */
export interface MiddlewareConsumer {
  /**
   * Specify one or more middleware to apply.
   *
   * @param mws - Functional middleware functions or class constructors.
   * @returns A builder object with a `forRoutes` method to bind the
   *   middleware to specific routes.
   */
  apply(...mws: MiddlewareFnOrClass[]): {
    forRoutes(...routes: MiddlewareRoute[]): MiddlewareConsumer
  }
}
