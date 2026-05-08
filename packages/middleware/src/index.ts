/**
 * @banhmi/middleware — functional, class-based, and module-level middleware
 * for Banhmi controllers and handlers.
 *
 * Three binding scopes:
 *
 * 1. **Module-level** — implement `configure(consumer: MiddlewareConsumer)` on
 *    a module class and call `consumer.apply(...).forRoutes(...)`.
 * 2. **Controller-level** — decorate a controller class with
 *    `@UseMiddleware(...)`.
 * 3. **Handler-level** — decorate an individual handler method with
 *    `@UseMiddleware(...)`.
 *
 * Middleware runs before guards in the enhancer pipeline. Calling `next()`
 * advances to the next middleware; omitting `next()` short-circuits the
 * pipeline.
 *
 * @example
 * import { UseMiddleware } from '@banhmi/middleware'
 * import type { MiddlewareConsumer, MiddlewareFn } from '@banhmi/middleware'
 *
 * const logger: MiddlewareFn = async (req, _ctx, next) => {
 *   console.log(req.method, req.url)
 *   return next()
 * }
 *
 * \@UseMiddleware(logger)
 * \@Controller('/cats')
 * class CatsController {}
 */

export type { MiddlewareBinding } from './middleware.consumer'
export { BunMiddlewareConsumer } from './middleware.consumer'
export { MiddlewareModule } from './middleware.module'
export type {
  BanhmiMiddleware,
  MiddlewareClass,
  MiddlewareConsumer,
  MiddlewareFn,
  MiddlewareFnOrClass,
  MiddlewareRoute,
} from './middleware.types'
export {
  METHOD_USE_MIDDLEWARE_METADATA,
  USE_MIDDLEWARE_METADATA,
} from './tokens'
export { UseMiddleware } from './use-middleware.decorator'
