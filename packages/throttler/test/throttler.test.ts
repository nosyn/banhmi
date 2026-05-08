import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module } from 'banhmi'
import { SkipThrottle, Throttle } from '../src/decorators'
import { MemoryThrottlerStorage } from '../src/storage/memory'
import { ThrottlerModule } from '../src/throttler.module'

// ---- Controller for default-rate-limit tests ----

@Controller()
class DefaultController {
  @Get('/default')
  handler() {
    return { ok: true }
  }
}

// ---- Controller for @SkipThrottle ----

@Controller()
class SkipController {
  @Get('/skip')
  @SkipThrottle()
  skipped() {
    return { skipped: true }
  }
}

// ---- Controller for @Throttle override ----

@Controller()
class OverrideController {
  @Get('/tight')
  @Throttle({ ttl: 60_000, limit: 2 })
  tight() {
    return { tight: true }
  }
}

let app: BanhmiApplication
let base: string
const storage = new MemoryThrottlerStorage()

beforeAll(async () => {
  @Module({
    imports: [
      ThrottlerModule.forRoot({
        ttl: 60_000,
        limit: 10,
        storage,
        // Use a fixed key so all requests count against the same bucket
        keyGenerator: () => 'test-client',
      }),
    ],
    controllers: [DefaultController, SkipController, OverrideController],
  })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

// ---- Under-limit: handler runs and headers are set ----

test('throttler: under limit - handler runs', async () => {
  const res = await fetch(`${base}/default`)
  expect(res.status).toBe(200)
})

test('throttler: under limit - X-RateLimit-Limit header set', async () => {
  const res = await fetch(`${base}/default`)
  expect(res.headers.get('x-ratelimit-limit')).toBe('10')
})

test('throttler: under limit - X-RateLimit-Remaining decrements', async () => {
  // Fresh storage for this test
  const freshStorage = new MemoryThrottlerStorage()

  @Controller()
  class RemainingController {
    @Get('/remaining')
    handler() {
      return { ok: true }
    }
  }

  @Module({
    imports: [
      ThrottlerModule.forRoot({
        ttl: 60_000,
        limit: 5,
        storage: freshStorage,
        keyGenerator: () => 'test-client',
      }),
    ],
    controllers: [RemainingController],
  })
  class RemainingModule {}

  const freshApp = await BanhmiFactory.create(RemainingModule)
  await freshApp.listen(0)
  const freshBase = freshApp.getUrl()

  const r1 = await fetch(`${freshBase}/remaining`)
  const r2 = await fetch(`${freshBase}/remaining`)

  expect(r1.headers.get('x-ratelimit-remaining')).toBe('4')
  expect(r2.headers.get('x-ratelimit-remaining')).toBe('3')

  await freshApp.close()
})

// ---- At limit: returns 429 ----

test('throttler: at limit - returns 429 with Retry-After', async () => {
  // Use a fresh module with limit=2 to avoid polluting shared storage
  const limitStorage = new MemoryThrottlerStorage()

  @Controller()
  class LimitController {
    @Get('/limited')
    handler() {
      return { ok: true }
    }
  }

  @Module({
    imports: [
      ThrottlerModule.forRoot({
        ttl: 60_000,
        limit: 2,
        storage: limitStorage,
        keyGenerator: () => 'limit-client',
      }),
    ],
    controllers: [LimitController],
  })
  class LimitModule {}

  const limitApp = await BanhmiFactory.create(LimitModule)
  await limitApp.listen(0)
  const limitBase = limitApp.getUrl()

  await fetch(`${limitBase}/limited`)
  await fetch(`${limitBase}/limited`)
  const overLimit = await fetch(`${limitBase}/limited`)

  expect(overLimit.status).toBe(429)
  expect(overLimit.headers.get('retry-after')).toBeTruthy()
  expect(overLimit.headers.get('x-ratelimit-limit')).toBe('2')
  expect(overLimit.headers.get('x-ratelimit-remaining')).toBe('0')

  await limitApp.close()
})

// ---- @SkipThrottle ----

test('throttler: @SkipThrottle exempts the handler', async () => {
  // Fire many requests to the skipped handler — none should be rate-limited
  const skipStorage = new MemoryThrottlerStorage()

  @Controller()
  class SkipOnlyController {
    @Get('/skipped-only')
    @SkipThrottle()
    handler() {
      return { ok: true }
    }
  }

  @Module({
    imports: [
      ThrottlerModule.forRoot({
        ttl: 60_000,
        limit: 1,
        storage: skipStorage,
        keyGenerator: () => 'skip-client',
      }),
    ],
    controllers: [SkipOnlyController],
  })
  class SkipModule {}

  const skipApp = await BanhmiFactory.create(SkipModule)
  await skipApp.listen(0)
  const skipBase = skipApp.getUrl()

  // Fire 5 requests, limit is 1 but all should pass due to @SkipThrottle
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${skipBase}/skipped-only`)
    expect(res.status).toBe(200)
  }

  await skipApp.close()
})

// ---- @Throttle override ----

test('throttler: @Throttle override applies tighter limit', async () => {
  const tightStorage = new MemoryThrottlerStorage()

  @Controller()
  class TightController {
    @Get('/tight2')
    @Throttle({ ttl: 60_000, limit: 2 })
    handler() {
      return { ok: true }
    }
  }

  @Module({
    imports: [
      ThrottlerModule.forRoot({
        ttl: 60_000,
        limit: 100,
        storage: tightStorage,
        keyGenerator: () => 'tight-client',
      }),
    ],
    controllers: [TightController],
  })
  class TightModule {}

  const tightApp = await BanhmiFactory.create(TightModule)
  await tightApp.listen(0)
  const tightBase = tightApp.getUrl()

  await fetch(`${tightBase}/tight2`)
  await fetch(`${tightBase}/tight2`)
  const third = await fetch(`${tightBase}/tight2`)

  // Module limit is 100 but @Throttle sets limit=2, so 3rd request should be 429
  expect(third.status).toBe(429)

  await tightApp.close()
})
