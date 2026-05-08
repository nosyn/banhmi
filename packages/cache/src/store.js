export class MemoryCacheStore {
  map = new Map()
  async get(key) {
    const entry = this.map.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key)
      return null
    }
    return entry.value
  }
  async set(key, value, ttlSeconds) {
    this.map.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }
  async del(key) {
    this.map.delete(key)
  }
}
