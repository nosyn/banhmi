import type { CallHandler, ExecutionContext, Interceptor } from '@banhmi/common'
import { METHOD_INTERCEPTORS_METADATA } from '@banhmi/common'
import type { CacheStore } from './store'

export interface CacheableOptions {
  store: CacheStore
  keyPrefix?: string
}

export function Cacheable(ttlSeconds: number, options: CacheableOptions) {
  return (
    originalMethod: (...args: unknown[]) => Promise<unknown>,
    context: ClassMethodDecoratorContext,
  ): ((...args: unknown[]) => Promise<unknown>) => {
    const methodName = context.name as string
    const store = options.store
    const keyPrefix = options.keyPrefix ?? methodName

    // Register as an interceptor in the HTTP pipeline (for BunAdapter)
    const interceptorInstance: Interceptor = {
      async intercept(
        ctx: ExecutionContext,
        next: CallHandler,
      ): Promise<unknown> {
        const routeCtx = ctx.getCtx()
        const paramsStr = JSON.stringify(
          (routeCtx as { params?: unknown }).params ?? {},
        )
        const queryStr = routeCtx.query.toString()
        const cacheKey = `${keyPrefix}:${paramsStr}:${queryStr}`

        const cached = await store.get(cacheKey)
        if (cached !== null) return cached

        const result = await next.handle()
        await store.set(cacheKey, result, ttlSeconds)
        return result
      },
    } as unknown as Interceptor

    const existing =
      (context.metadata[METHOD_INTERCEPTORS_METADATA] as
        | Record<string, unknown[]>
        | undefined) ?? {}
    context.metadata[METHOD_INTERCEPTORS_METADATA] = {
      ...existing,
      [methodName]: [...(existing[methodName] ?? []), interceptorInstance],
    }

    // Also wrap the method directly so it works in isolation (no HTTP context)
    return async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`
      const cached = await store.get(cacheKey)
      if (cached !== null) return cached
      const result = await originalMethod.apply(this, args)
      await store.set(cacheKey, result, ttlSeconds)
      return result
    }
  }
}
