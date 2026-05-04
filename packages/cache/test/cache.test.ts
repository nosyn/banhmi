import { afterEach, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { CacheModule } from '../src/cache.module'
import { CacheEvict } from '../src/cache-evict'
import { Cacheable } from '../src/cacheable'
import type { CacheStore } from '../src/store'
import { MemoryCacheStore } from '../src/store'
import { CACHE_STORE_TOKEN } from '../src/tokens'

describe('MemoryCacheStore', () => {
  test('set and get a value', async () => {
    const store = new MemoryCacheStore()
    await store.set('key1', 'value1', 60)
    expect(await store.get('key1')).toBe('value1')
  })

  test('returns null for missing key', async () => {
    const store = new MemoryCacheStore()
    expect(await store.get('missing')).toBeNull()
  })

  test('expired entry returns null', async () => {
    const store = new MemoryCacheStore()
    await store.set('expiring', 'data', 0)
    await Bun.sleep(1)
    expect(await store.get('expiring')).toBeNull()
  })

  test('del removes a key', async () => {
    const store = new MemoryCacheStore()
    await store.set('toDelete', 'data', 60)
    await store.del('toDelete')
    expect(await store.get('toDelete')).toBeNull()
  })
})

describe('@Cacheable', () => {
  test('caches the result of a method call', async () => {
    const store = new MemoryCacheStore()
    let callCount = 0

    class DataService {
      @Cacheable(60, { store })
      async fetchData(_id: number): Promise<{ id: number; data: string }> {
        callCount++
        return { id: _id, data: `result-${_id}` }
      }
    }

    const svc = new DataService()
    const first = await svc.fetchData(1)
    const second = await svc.fetchData(1)

    expect(first).toEqual(second)
    expect(callCount).toBe(1)
  })

  test('different arguments produce different cache keys', async () => {
    const store = new MemoryCacheStore()
    let callCount = 0

    class DataService {
      @Cacheable(60, { store })
      async fetchData(_id: number): Promise<string> {
        callCount++
        return `result-${_id}`
      }
    }

    const svc = new DataService()
    await svc.fetchData(1)
    await svc.fetchData(2)

    expect(callCount).toBe(2)
  })
})

describe('@CacheEvict', () => {
  test('removes an entry from the store after method call', async () => {
    const store = new MemoryCacheStore()
    await store.set('test-key', 'some-value', 60)

    class DataService {
      @CacheEvict('test-key', { store })
      async mutate(): Promise<void> {}
    }

    const svc = new DataService()
    await svc.mutate()

    expect(await store.get('test-key')).toBeNull()
  })
})

describe('CacheModule.forRoot', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('registers MemoryCacheStore when store is "memory"', async () => {
    @Module({ imports: [CacheModule.forRoot({ store: 'memory' })] })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const cacheStore = app.container.resolve(CACHE_STORE_TOKEN) as CacheStore
    expect(typeof cacheStore.get).toBe('function')
    expect(typeof cacheStore.set).toBe('function')
    expect(typeof cacheStore.del).toBe('function')
  })
})
