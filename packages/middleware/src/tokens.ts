/**
 * Symbol key for handler/controller-level `@UseMiddleware` metadata.
 *
 * Class-level: stores `MiddlewareFnOrClass[]`.
 * Method-level: stores `Record<string, MiddlewareFnOrClass[]>`.
 */
export const USE_MIDDLEWARE_METADATA = Symbol('banhmi:use_middleware')

/**
 * Symbol key for method-level `@UseMiddleware` overrides.
 *
 * Stored as `Record<methodName, MiddlewareFnOrClass[]>`.
 */
export const METHOD_USE_MIDDLEWARE_METADATA = Symbol(
  'banhmi:method_use_middleware',
)
