export function CacheEvict(key, options) {
  return (originalMethod, _context) => {
    return async function (...args) {
      const result = await originalMethod.apply(this, args)
      await options.store.del(key)
      return result
    }
  }
}
