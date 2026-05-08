/**
 * Context passed to each field middleware function.
 *
 * @example
 * const loggingMiddleware: FieldMiddlewareFn = async (ctx, next) => {
 *   console.log(`Resolving ${ctx.fieldName}`)
 *   const result = await next()
 *   console.log(`Resolved ${ctx.fieldName}:`, result)
 *   return result
 * }
 */
export interface FieldMiddlewareContext {
  /** The field name being resolved. */
  fieldName: string
  /** The parent object. */
  root: unknown
  /** Arguments passed to the field. */
  args: Record<string, unknown>
  /** The resolver context. */
  context: unknown
  /** GraphQL resolve info (when available). */
  info: unknown
}

/**
 * A field middleware function that wraps field resolution.
 *
 * @example
 * const authMiddleware: FieldMiddlewareFn = async (ctx, next) => {
 *   if (!ctx.context.user) throw new Error('Unauthorized')
 *   return next()
 * }
 */
export type FieldMiddlewareFn = (
  ctx: FieldMiddlewareContext,
  next: () => Promise<unknown>,
) => Promise<unknown>

/**
 * Registry of globally-applied field middlewares.
 * @internal
 */
const globalFieldMiddlewares: FieldMiddlewareFn[] = []

/**
 * Registers a global field middleware that runs for every field resolution.
 *
 * @param middleware - The middleware function to register.
 *
 * @example
 * addFieldMiddleware(async (ctx, next) => {
 *   const start = Date.now()
 *   const result = await next()
 *   console.log(`${ctx.fieldName} took ${Date.now() - start}ms`)
 *   return result
 * })
 */
export function addFieldMiddleware(middleware: FieldMiddlewareFn): void {
  globalFieldMiddlewares.push(middleware)
}

/**
 * Get all registered global field middlewares.
 * @internal
 */
export function getFieldMiddlewares(): FieldMiddlewareFn[] {
  return [...globalFieldMiddlewares]
}

/**
 * Clears all registered global field middlewares.
 * Primarily useful in tests.
 *
 * @example
 * afterEach(() => clearFieldMiddlewares())
 */
export function clearFieldMiddlewares(): void {
  globalFieldMiddlewares.length = 0
}

/**
 * Wraps a resolver function with the registered field middlewares.
 *
 * @param fieldName - The field name for middleware context.
 * @param resolver - The original resolver function.
 * @param middlewares - The middlewares to apply (defaults to global).
 *
 * @example
 * const wrapped = applyFieldMiddlewares('cats', originalResolver, [authMiddleware])
 */
export function applyFieldMiddlewares(
  fieldName: string,
  resolver: (
    root: unknown,
    args: Record<string, unknown>,
    context: unknown,
    info: unknown,
  ) => unknown,
  middlewares: FieldMiddlewareFn[] = globalFieldMiddlewares,
): (
  root: unknown,
  args: Record<string, unknown>,
  context: unknown,
  info: unknown,
) => Promise<unknown> {
  return async (root, args, context, info) => {
    let index = 0

    const next = async (): Promise<unknown> => {
      if (index < middlewares.length) {
        const mw = middlewares[index]
        index++
        if (!mw) return resolver(root, args, context, info)
        return mw({ fieldName, root, args, context, info }, next)
      }
      return resolver(root, args, context, info)
    }

    return next()
  }
}
