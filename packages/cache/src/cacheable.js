import { METHOD_INTERCEPTORS_METADATA } from '@banhmi/common'
export function Cacheable(ttlSeconds, options) {
  return (originalMethod, context) => {
    const methodName = context.name
    const store = options.store
    const keyPrefix = options.keyPrefix ?? methodName
    // Register as an interceptor in the HTTP pipeline (for BunAdapter)
    const interceptorInstance = {
      async intercept(ctx, next) {
        const routeCtx = ctx.getCtx()
        const paramsStr = JSON.stringify(routeCtx.params ?? {})
        const queryStr = routeCtx.query.toString()
        const cacheKey = `${keyPrefix}:${paramsStr}:${queryStr}`
        const cached = await store.get(cacheKey)
        if (cached !== null) return cached
        const result = await next.handle()
        await store.set(cacheKey, result, ttlSeconds)
        return result
      },
    }
    const existing = context.metadata[METHOD_INTERCEPTORS_METADATA] ?? {}
    context.metadata[METHOD_INTERCEPTORS_METADATA] = {
      ...existing,
      [methodName]: [...(existing[methodName] ?? []), interceptorInstance],
    }
    // Also wrap the method directly so it works in isolation (no HTTP context)
    return async function (...args) {
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`
      const cached = await store.get(cacheKey)
      if (cached !== null) return cached
      const result = await originalMethod.apply(this, args)
      await store.set(cacheKey, result, ttlSeconds)
      return result
    }
  }
}
