import type { MiddlewareFnOrClass } from './middleware.types'
import {
  METHOD_USE_MIDDLEWARE_METADATA,
  USE_MIDDLEWARE_METADATA,
} from './tokens'

/**
 * Applies one or more middleware to a controller class or individual handler.
 *
 * When applied to a **class**, all handlers in the controller run the
 * specified middleware before guards. When applied to a **method**, only that
 * handler is affected.
 *
 * Middleware is executed in the order it is passed, after module-level
 * middleware and before class-level middleware from `@UseMiddleware` on the
 * class itself.
 *
 * @param mws - Functional middleware functions or class constructors
 *   implementing `BanhmiMiddleware`.
 *
 * @example
 * // Apply to all handlers in a controller
 * \@UseMiddleware(LoggerMiddleware)
 * \@Controller('/cats')
 * class CatsController {}
 *
 * // Apply to a single handler
 * \@Controller('/cats')
 * class CatsController {
 *   \@UseMiddleware(AuthMiddleware, RateLimitMiddleware)
 *   \@Post()
 *   create(ctx: RouteCtx) { ... }
 * }
 */
export function UseMiddleware(...mws: MiddlewareFnOrClass[]) {
  return (
    _target: unknown,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): void => {
    if (context.kind === 'class') {
      const existing =
        (context.metadata[USE_MIDDLEWARE_METADATA] as
          | MiddlewareFnOrClass[]
          | undefined) ?? []
      context.metadata[USE_MIDDLEWARE_METADATA] = [...existing, ...mws]
    } else {
      const methodName = context.name as string
      const existing =
        (context.metadata[METHOD_USE_MIDDLEWARE_METADATA] as
          | Record<string, MiddlewareFnOrClass[]>
          | undefined) ?? {}
      context.metadata[METHOD_USE_MIDDLEWARE_METADATA] = {
        ...existing,
        [methodName]: [...(existing[methodName] ?? []), ...mws],
      }
    }
  }
}
