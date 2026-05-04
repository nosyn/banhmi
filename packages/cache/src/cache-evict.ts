import type { CacheStore } from './store'

export interface CacheEvictOptions {
  store: CacheStore
}

export function CacheEvict(key: string, options: CacheEvictOptions) {
  return (
    originalMethod: (...args: unknown[]) => Promise<unknown>,
    _context: ClassMethodDecoratorContext,
  ) => {
    return async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const result = await originalMethod.apply(this, args)
      await options.store.del(key)
      return result
    }
  }
}
