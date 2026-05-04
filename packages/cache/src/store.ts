export interface CacheStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}

interface CacheEntry {
  value: unknown
  expiresAt: number
}

export class MemoryCacheStore implements CacheStore {
  private readonly map = new Map<string, CacheEntry>()

  async get(key: string): Promise<unknown> {
    const entry = this.map.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.map.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  async del(key: string): Promise<void> {
    this.map.delete(key)
  }
}
