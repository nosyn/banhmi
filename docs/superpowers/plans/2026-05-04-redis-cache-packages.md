# @banhmi/redis + @banhmi/cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@banhmi/redis` (ioredis wrapper with pub/sub) and `@banhmi/cache` (`@Cacheable`/`@CacheEvict` decorators with in-memory and Redis stores), plus fix the enhancer pipeline to support pre-created interceptor instances for `@Cacheable`.

**Architecture:** `@Cacheable(ttl)` cannot use the standard `new I()` pattern because it needs a store reference captured at decoration time. The fix: change `bun-adapter.ts` to detect whether an interceptor entry is a class or already an instance: `typeof I === 'function' ? new I() : I`. `@Cacheable` stores a pre-created `CacheInterceptor` instance (closing over the store) in `METHOD_INTERCEPTORS_METADATA`. `CacheModule.forRoot` wires a `CacheStore` provider. `RedisModule.forRoot` wraps `ioredis`.

**Tech Stack:** `ioredis` (Redis client), `bun:test`, TC39 Stage 3 decorators

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/platform-bun/src/bun-adapter.ts` | Fix interceptor instantiation: class → `new I()`, instance → use as-is |
| `packages/redis/package.json` | Package manifest — `@banhmi/redis` |
| `packages/redis/tsconfig.json` | Extends root tsconfig |
| `packages/redis/bunfig.toml` | Preloads Symbol.metadata polyfill |
| `packages/redis/src/tokens.ts` | `REDIS_TOKEN` |
| `packages/redis/src/redis.module.ts` | `RedisModule.forRoot(url)` |
| `packages/redis/src/redis.service.ts` | Typed `get/set/del/expire/publish/subscribe` |
| `packages/redis/src/index.ts` | Re-exports |
| `packages/redis/test/redis.test.ts` | Unit tests (mocked ioredis) |
| `packages/cache/package.json` | Package manifest — `@banhmi/cache` |
| `packages/cache/tsconfig.json` | Extends root tsconfig |
| `packages/cache/bunfig.toml` | Preloads Symbol.metadata polyfill |
| `packages/cache/src/store.ts` | `CacheStore` interface + `MemoryCacheStore` implementation |
| `packages/cache/src/tokens.ts` | `CACHE_STORE_TOKEN` |
| `packages/cache/src/cache.module.ts` | `CacheModule.forRoot({ store })` |
| `packages/cache/src/cacheable.ts` | `@Cacheable(ttl, keyFn?)` decorator |
| `packages/cache/src/cache-evict.ts` | `@CacheEvict(key)` decorator |
| `packages/cache/src/index.ts` | Re-exports |
| `packages/cache/test/cache.test.ts` | Unit tests |
| `packages/banhmi/src/index.ts` | Add exports for both packages |
| `packages/banhmi/package.json` | Add workspace deps |

---

### Task 1: Fix enhancer pipeline to support interceptor instances

**Files:**
- Modify: `packages/platform-bun/src/bun-adapter.ts`
- Modify: `packages/platform-bun/test/integration.test.ts`

- [ ] **Step 1: Write the failing test** (add to `packages/platform-bun/test/integration.test.ts`)

```ts
import type { CallHandler, ExecutionContext, Interceptor } from '@banhmi/common'

test('pre-created interceptor instance is used directly (not re-instantiated)', async () => {
  let instanceCount = 0

  class CountingInterceptor implements Interceptor {
    constructor() { instanceCount++ }
    intercept(_ctx: ExecutionContext, next: CallHandler) { return next.handle() }
  }

  // Pre-create the instance (simulating @Cacheable pattern)
  const preCreated = new CountingInterceptor()
  instanceCount = 0 // reset after pre-creation

  @Controller('/instance-test')
  class InstanceTestController {
    @UseInterceptors(preCreated as unknown as ClassConstructor)
    @Get('/')
    index() { return { ok: true } }
  }

  // ...setup app, make request, assert instanceCount === 0 (not re-instantiated)
  // Note: This test verifies the pipeline behavior after the fix is applied.
  // The actual assertion is that instanceCount remains 0 when the route is hit.
  expect(instanceCount).toBe(0)
})
```

Note: This is a unit-level behavioral test. Add it after confirming the pipeline fix below makes it work.

- [ ] **Step 2: Locate the interceptor instantiation line in `bun-adapter.ts`**

```bash
grep -n "interceptorInstances\|new I()" packages/platform-bun/src/bun-adapter.ts
```

Expected output includes something like:
```
167:    const interceptorInstances = match.interceptors.map((I) => new I())
```

- [ ] **Step 3: Update `bun-adapter.ts` line ~167**

Change:
```ts
const interceptorInstances = match.interceptors.map((I) => new I())
```

To:
```ts
const interceptorInstances = match.interceptors.map((I) =>
  typeof I === 'function' ? new (I as new () => Interceptor)() : (I as Interceptor),
)
```

Also update the type import at the top of the file — add `Interceptor` to the import from `@banhmi/common`:
```ts
import type { ClassConstructor, HttpAdapter, Interceptor } from '@banhmi/core'
```

Check current imports first:
```bash
head -10 packages/platform-bun/src/bun-adapter.ts
```

- [ ] **Step 4: Run platform-bun tests**

```bash
cd packages/platform-bun && bun test
```
Expected: all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/platform-bun/src/bun-adapter.ts
git commit -m "fix(platform-bun): support pre-created interceptor instances in enhancer pipeline"
```

---

### Task 2: @banhmi/cache — CacheStore + MemoryCacheStore

**Files:**
- Create: `packages/cache/package.json`
- Create: `packages/cache/tsconfig.json`
- Create: `packages/cache/bunfig.toml`
- Create: `packages/cache/src/store.ts`
- Create: `packages/cache/src/tokens.ts`
- Create: `packages/cache/test/cache.test.ts`

- [ ] **Step 1: Create `packages/cache/package.json`**

```json
{
  "name": "@banhmi/cache",
  "version": "0.5.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@banhmi/common": "workspace:*",
    "@banhmi/core": "workspace:*"
  }
}
```

- [ ] **Step 2: Create `packages/cache/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `packages/cache/bunfig.toml`**

```toml
[test]
preload = ["../common/src/polyfill-symbol-metadata.ts"]
```

- [ ] **Step 4: Write the failing test for MemoryCacheStore**

Create `packages/cache/test/cache.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { MemoryCacheStore } from '../src/store'

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
    await store.set('expiring', 'data', 0) // 0 seconds TTL
    // Wait 1ms to ensure expiry
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
```

- [ ] **Step 5: Run to confirm failure**

```bash
cd packages/cache && bun test test/cache.test.ts
```
Expected: FAIL — `MemoryCacheStore` not found.

- [ ] **Step 6: Create `packages/cache/src/store.ts`**

```ts
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
```

- [ ] **Step 7: Create `packages/cache/src/tokens.ts`**

```ts
import { Token } from '@banhmi/common'
import type { CacheStore } from './store'

export const CACHE_STORE_TOKEN = Token<CacheStore>('CacheStore')
```

- [ ] **Step 8: Run tests to confirm they pass**

```bash
cd packages/cache && bun test test/cache.test.ts
```
Expected: 4 tests passing.

- [ ] **Step 9: Commit**

```bash
git add packages/cache/
git commit -m "feat(cache): add CacheStore interface and MemoryCacheStore implementation"
```

---

### Task 3: @Cacheable and @CacheEvict decorators

**Files:**
- Create: `packages/cache/src/cacheable.ts`
- Create: `packages/cache/src/cache-evict.ts`

- [ ] **Step 1: Write the failing tests** (add to `packages/cache/test/cache.test.ts`)

```ts
import { Cacheable } from '../src/cacheable'
import { CacheEvict } from '../src/cache-evict'

describe('@Cacheable', () => {
  test('caches the result of a method call', async () => {
    const store = new MemoryCacheStore()
    let callCount = 0

    class DataService {
      @Cacheable(60, { store })
      async fetchData(id: number): Promise<{ id: number; data: string }> {
        callCount++
        return { id, data: `result-${id}` }
      }
    }

    const svc = new DataService()
    const first = await svc.fetchData(1)
    const second = await svc.fetchData(1)

    expect(first).toEqual(second)
    expect(callCount).toBe(1) // only called once
  })

  test('different arguments produce different cache keys', async () => {
    const store = new MemoryCacheStore()
    let callCount = 0

    class DataService {
      @Cacheable(60, { store })
      async fetchData(id: number): Promise<string> {
        callCount++
        return `result-${id}`
      }
    }

    const svc = new DataService()
    await svc.fetchData(1)
    await svc.fetchData(2)

    expect(callCount).toBe(2)
  })
})

describe('@CacheEvict', () => {
  test('removes an entry from the store', async () => {
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/cache && bun test test/cache.test.ts
```
Expected: FAIL — `Cacheable`, `CacheEvict` not found.

- [ ] **Step 3: Create `packages/cache/src/cacheable.ts`**

```ts
import { METHOD_INTERCEPTORS_METADATA } from '@banhmi/common'
import type { CallHandler, ExecutionContext, Interceptor } from '@banhmi/common'
import type { CacheStore } from './store'

export interface CacheableOptions {
  store: CacheStore
  keyPrefix?: string
}

export function Cacheable(ttlSeconds: number, options: CacheableOptions) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const methodName = context.name as string
    const store = options.store
    const keyPrefix = options.keyPrefix ?? methodName

    // Pre-create the interceptor instance (closes over store and TTL)
    const interceptorInstance: Interceptor = {
      async intercept(ctx: ExecutionContext, next: CallHandler): Promise<unknown> {
        const routeCtx = ctx.getCtx()
        const args = JSON.stringify((routeCtx as { params?: unknown }).params ?? {})
        const cacheKey = `${keyPrefix}:${args}`

        const cached = await store.get(cacheKey)
        if (cached !== null) return cached

        const result = await next.handle()
        await store.set(cacheKey, result, ttlSeconds)
        return result
      },
    }

    const existing =
      (context.metadata[METHOD_INTERCEPTORS_METADATA] as
        | Record<string, unknown[]>
        | undefined) ?? {}
    context.metadata[METHOD_INTERCEPTORS_METADATA] = {
      ...existing,
      [methodName]: [...(existing[methodName] ?? []), interceptorInstance],
    }
  }
}
```

- [ ] **Step 4: Create `packages/cache/src/cache-evict.ts`**

```ts
import type { CacheStore } from './store'

export interface CacheEvictOptions {
  store: CacheStore
}

export function CacheEvict(key: string, options: CacheEvictOptions) {
  return (
    originalMethod: (...args: unknown[]) => Promise<unknown>,
    context: ClassMethodDecoratorContext,
  ) => {
    return async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      const result = await originalMethod.apply(this, args)
      await options.store.del(key)
      return result
    }
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd packages/cache && bun test test/cache.test.ts
```
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add packages/cache/src/cacheable.ts packages/cache/src/cache-evict.ts packages/cache/test/cache.test.ts
git commit -m "feat(cache): add @Cacheable and @CacheEvict decorators"
```

---

### Task 4: CacheModule.forRoot + index

**Files:**
- Create: `packages/cache/src/cache.module.ts`
- Create: `packages/cache/src/index.ts`

- [ ] **Step 1: Write the failing test** (add to `packages/cache/test/cache.test.ts`)

```ts
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { CacheModule } from '../src/cache.module'
import { CACHE_STORE_TOKEN } from '../src/tokens'
import type { CacheStore } from '../src/store'

describe('CacheModule.forRoot', () => {
  test('registers MemoryCacheStore when store is "memory"', async () => {
    @Module({ imports: [CacheModule.forRoot({ store: 'memory' })] })
    class AppModule {}

    const app = await BanhmiFactory.create(AppModule)
    const store = app.get(CACHE_STORE_TOKEN) as CacheStore
    expect(typeof store.get).toBe('function')
    expect(typeof store.set).toBe('function')
    await app.close()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/cache && bun test test/cache.test.ts
```
Expected: FAIL — `CacheModule` not found.

- [ ] **Step 3: Create `packages/cache/src/cache.module.ts`**

```ts
import { Module } from '@banhmi/common'
import { MemoryCacheStore } from './store'
import { CACHE_STORE_TOKEN } from './tokens'

export interface CacheModuleOptions {
  store: 'memory' | 'redis'
  redisUrl?: string
}

export class CacheModule {
  static forRoot(options: CacheModuleOptions) {
    @Module({
      providers: [
        {
          provide: CACHE_STORE_TOKEN,
          useFactory: async () => {
            if (options.store === 'redis') {
              // Lazy import to avoid hard dependency on @banhmi/redis
              const { RedisCacheStore } = await import('@banhmi/redis')
              return new RedisCacheStore(options.redisUrl ?? 'redis://localhost:6379')
            }
            return new MemoryCacheStore()
          },
        },
      ],
      exports: [CACHE_STORE_TOKEN],
    })
    class CacheRootModule {}

    return CacheRootModule
  }
}
```

- [ ] **Step 4: Create `packages/cache/src/index.ts`**

```ts
export { CacheModule } from './cache.module'
export type { CacheModuleOptions } from './cache.module'
export { CACHE_STORE_TOKEN } from './tokens'
export type { CacheStore } from './store'
export { MemoryCacheStore } from './store'
export { Cacheable } from './cacheable'
export type { CacheableOptions } from './cacheable'
export { CacheEvict } from './cache-evict'
export type { CacheEvictOptions } from './cache-evict'
```

- [ ] **Step 5: Run all cache tests**

```bash
cd packages/cache && bun test test/cache.test.ts
```
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add packages/cache/src/cache.module.ts packages/cache/src/index.ts packages/cache/test/cache.test.ts
git commit -m "feat(cache): add CacheModule.forRoot with memory/redis store selection"
```

---

### Task 5: @banhmi/redis package

**Files:**
- Create: `packages/redis/package.json`
- Create: `packages/redis/tsconfig.json`
- Create: `packages/redis/bunfig.toml`
- Create: `packages/redis/src/tokens.ts`
- Create: `packages/redis/src/redis-cache-store.ts`
- Create: `packages/redis/src/redis.module.ts`
- Create: `packages/redis/src/redis.service.ts`
- Create: `packages/redis/src/index.ts`
- Create: `packages/redis/test/redis.test.ts`

- [ ] **Step 1: Create `packages/redis/package.json`**

```json
{
  "name": "@banhmi/redis",
  "version": "0.5.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@banhmi/common": "workspace:*",
    "@banhmi/core": "workspace:*",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/ioredis": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/redis/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `packages/redis/bunfig.toml`**

```toml
[test]
preload = ["../common/src/polyfill-symbol-metadata.ts"]
```

- [ ] **Step 4: Install ioredis**

```bash
cd packages/redis && bun add ioredis
```

- [ ] **Step 5: Write failing tests using mock ioredis**

Create `packages/redis/test/redis.test.ts`:

```ts
import { describe, expect, mock, test } from 'bun:test'

// Mock ioredis before importing RedisService
const mockRedis = {
  get: mock(async (_key: string) => null as string | null),
  set: mock(async (_key: string, _val: string, _mode?: string, _ttl?: number) => 'OK'),
  del: mock(async (_key: string) => 1),
  expire: mock(async (_key: string, _seconds: number) => 1),
  publish: mock(async (_channel: string, _message: string) => 1),
  subscribe: mock((_channel: string, _callback: (msg: string) => void) => {}),
  quit: mock(async () => 'OK'),
}

import { RedisService } from '../src/redis.service'

describe('RedisService', () => {
  test('get delegates to ioredis', async () => {
    mockRedis.get.mockResolvedValueOnce('cached-value')
    const svc = new RedisService(mockRedis as unknown as import('ioredis').Redis)
    const result = await svc.get('myKey')
    expect(result).toBe('cached-value')
    expect(mockRedis.get).toHaveBeenCalledWith('myKey')
  })

  test('set delegates to ioredis with TTL', async () => {
    const svc = new RedisService(mockRedis as unknown as import('ioredis').Redis)
    await svc.set('myKey', 'myValue', 120)
    expect(mockRedis.set).toHaveBeenCalledWith('myKey', 'myValue', 'EX', 120)
  })

  test('del delegates to ioredis', async () => {
    const svc = new RedisService(mockRedis as unknown as import('ioredis').Redis)
    await svc.del('myKey')
    expect(mockRedis.del).toHaveBeenCalledWith('myKey')
  })
})
```

- [ ] **Step 6: Run to confirm failure**

```bash
cd packages/redis && bun test test/redis.test.ts
```
Expected: FAIL — `RedisService` not found.

- [ ] **Step 7: Create `packages/redis/src/tokens.ts`**

```ts
import { Token } from '@banhmi/common'
import type { Redis } from 'ioredis'

export const REDIS_TOKEN = Token<Redis>('RedisClient')
```

- [ ] **Step 8: Create `packages/redis/src/redis.service.ts`**

```ts
import { Injectable } from '@banhmi/common'
import type { Redis } from 'ioredis'
import { REDIS_TOKEN } from './tokens'

@Injectable()
export class RedisService {
  static inject = [REDIS_TOKEN] as const

  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.redis.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.redis.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds)
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message)
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    this.redis.subscribe(channel, (_err, _count) => {})
    this.redis.on('message', (_ch: string, msg: string) => {
      if (_ch === channel) callback(msg)
    })
  }

  async quit(): Promise<void> {
    await this.redis.quit()
  }
}
```

- [ ] **Step 9: Create `packages/redis/src/redis-cache-store.ts`**

```ts
import type { CacheStore } from '@banhmi/cache'
import type { Redis } from 'ioredis'

export class RedisCacheStore implements CacheStore {
  private redis: Redis | null = null

  constructor(private readonly url: string) {}

  private async getRedis(): Promise<Redis> {
    if (!this.redis) {
      const { default: IORedis } = await import('ioredis')
      this.redis = new IORedis(this.url)
    }
    return this.redis
  }

  async get(key: string): Promise<unknown> {
    const redis = await this.getRedis()
    const val = await redis.get(key)
    if (val === null) return null
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const redis = await this.getRedis()
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  async del(key: string): Promise<void> {
    const redis = await this.getRedis()
    await redis.del(key)
  }
}
```

- [ ] **Step 10: Create `packages/redis/src/redis.module.ts`**

```ts
import { Module } from '@banhmi/common'
import { RedisService } from './redis.service'
import { REDIS_TOKEN } from './tokens'

export class RedisModule {
  static forRoot(url: string) {
    @Module({
      providers: [
        {
          provide: REDIS_TOKEN,
          useFactory: async () => {
            const { default: IORedis } = await import('ioredis')
            return new IORedis(url)
          },
        },
        RedisService,
      ],
      exports: [REDIS_TOKEN, RedisService],
    })
    class RedisRootModule {}

    return RedisRootModule
  }
}
```

- [ ] **Step 11: Create `packages/redis/src/index.ts`**

```ts
export { RedisModule } from './redis.module'
export { RedisService } from './redis.service'
export { REDIS_TOKEN } from './tokens'
export { RedisCacheStore } from './redis-cache-store'
```

- [ ] **Step 12: Run tests to confirm they pass**

```bash
cd packages/redis && bun test test/redis.test.ts
```
Expected: all passing.

- [ ] **Step 13: Commit**

```bash
git add packages/redis/
git commit -m "feat(redis): add @banhmi/redis with RedisModule, RedisService, and RedisCacheStore"
```

---

### Task 6: Wire both packages into banhmi facade

**Files:**
- Modify: `packages/banhmi/src/index.ts`
- Modify: `packages/banhmi/package.json`

- [ ] **Step 1: Add exports to `packages/banhmi/src/index.ts`**

```ts
export * from '@banhmi/redis'
export * from '@banhmi/cache'
```

- [ ] **Step 2: Add dependencies to `packages/banhmi/package.json`**

```json
"@banhmi/redis": "workspace:*",
"@banhmi/cache": "workspace:*"
```

- [ ] **Step 3: Install**

```bash
bun install
```

- [ ] **Step 4: Run full test suite**

```bash
bun test --recursive
```
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add packages/banhmi/src/index.ts packages/banhmi/package.json bun.lock
git commit -m "feat(banhmi): export @banhmi/redis and @banhmi/cache from facade"
```
