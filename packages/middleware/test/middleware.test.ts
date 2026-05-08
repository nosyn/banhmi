import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Controller, Get, Module, Post } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import type { MiddlewareFn } from '../src/middleware.types'
import { UseMiddleware } from '../src/use-middleware.decorator'

// ─── 1. Functional middleware sees the request ────────────────────────────────

describe('functional middleware sees the request', () => {
  const seen: string[] = []

  const logger: MiddlewareFn = async (req, _ctx, next) => {
    seen.push(`${req.method} ${new URL(req.url).pathname}`)
    return next()
  }

  @Controller('/ping')
  class PingController {
    @Get()
    ping() {
      return { pong: true }
    }
  }

  @Module({ controllers: [PingController] })
  class AppModule {
    configure(consumer: {
      apply: MiddlewareFn['constructor']
      forRoutes: unknown
    }) {
      ;(
        consumer as unknown as {
          apply(...mws: MiddlewareFn[]): {
            forRoutes(...routes: string[]): void
          }
        }
      )
        .apply(logger)
        .forRoutes('ping')
    }
  }

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('middleware logger is called with the request', async () => {
    seen.length = 0
    const res = await fetch(`${base}/ping`)
    expect(res.status).toBe(200)
    expect(seen).toHaveLength(1)
    expect(seen[0]).toBe('GET /ping')
  })
})

// ─── 2. Middleware can mutate response headers ─────────────────────────────

describe('middleware can add response headers', () => {
  const addHeader: MiddlewareFn = async (_req, _ctx, next) => {
    const res = await next()
    const cloned = new Response(res.body, res)
    cloned.headers.set('x-custom-header', 'banhmi')
    return cloned
  }

  @Controller('/items')
  class ItemsController {
    @Get()
    list() {
      return { items: [] }
    }
  }

  @Module({ controllers: [ItemsController] })
  class AppModule {
    configure(consumer: unknown) {
      ;(
        consumer as {
          apply(...mws: MiddlewareFn[]): {
            forRoutes(...routes: string[]): void
          }
        }
      )
        .apply(addHeader)
        .forRoutes('items')
    }
  }

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('response contains the header added by middleware', async () => {
    const res = await fetch(`${base}/items`)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-custom-header')).toBe('banhmi')
  })
})

// ─── 3. Short-circuit: middleware that does not call next() ──────────────────

describe('middleware short-circuit', () => {
  const block: MiddlewareFn = async (_req, _ctx, _next) => {
    return new Response('blocked', { status: 403 })
  }

  @Controller('/guarded')
  class GuardedController {
    @Get()
    get() {
      return { secret: 'data' }
    }
  }

  @Module({ controllers: [GuardedController] })
  class AppModule {
    configure(consumer: unknown) {
      ;(
        consumer as {
          apply(...mws: MiddlewareFn[]): {
            forRoutes(...routes: string[]): void
          }
        }
      )
        .apply(block)
        .forRoutes('guarded')
    }
  }

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('middleware blocks the handler from running', async () => {
    const res = await fetch(`${base}/guarded`)
    expect(res.status).toBe(403)
    expect(await res.text()).toBe('blocked')
  })
})

// ─── 4. forRoutes path matching ───────────────────────────────────────────────

describe('forRoutes path matching', () => {
  const hits: string[] = []

  const tracker: MiddlewareFn = async (req, _ctx, next) => {
    hits.push(new URL(req.url).pathname)
    return next()
  }

  @Controller('/cats')
  class CatsController {
    @Get()
    list() {
      return { cats: [] }
    }

    @Get('/:id')
    get() {
      return { cat: {} }
    }
  }

  @Controller('/dogs')
  class DogsController {
    @Get()
    list() {
      return { dogs: [] }
    }
  }

  @Module({ controllers: [CatsController, DogsController] })
  class AppModule {
    configure(consumer: unknown) {
      ;(
        consumer as {
          apply(...mws: MiddlewareFn[]): {
            forRoutes(...routes: string[]): void
          }
        }
      )
        .apply(tracker)
        .forRoutes('cats')
    }
  }

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('matches /cats', async () => {
    hits.length = 0
    await fetch(`${base}/cats`)
    expect(hits).toContain('/cats')
  })

  test('matches /cats/123', async () => {
    hits.length = 0
    await fetch(`${base}/cats/123`)
    expect(hits).toContain('/cats/123')
  })

  test('does NOT match /dogs', async () => {
    hits.length = 0
    await fetch(`${base}/dogs`)
    expect(hits).toHaveLength(0)
  })
})

// ─── 5. forRoutes method filter ───────────────────────────────────────────────

describe('forRoutes method filter', () => {
  const hits: string[] = []

  const tracker: MiddlewareFn = async (req, _ctx, next) => {
    hits.push(req.method)
    return next()
  }

  @Controller('/notes')
  class NotesController {
    @Get()
    list() {
      return { notes: [] }
    }

    @Post()
    create() {
      return { created: true }
    }
  }

  @Module({ controllers: [NotesController] })
  class AppModule {
    configure(consumer: unknown) {
      ;(
        consumer as {
          apply(...mws: MiddlewareFn[]): {
            forRoutes(...routes: Array<{ path: string; method: string }>): void
          }
        }
      )
        .apply(tracker)
        .forRoutes({ path: 'notes', method: 'POST' })
    }
  }

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('middleware runs for POST /notes', async () => {
    hits.length = 0
    await fetch(`${base}/notes`, { method: 'POST' })
    expect(hits).toContain('POST')
  })

  test('middleware does NOT run for GET /notes', async () => {
    hits.length = 0
    await fetch(`${base}/notes`)
    expect(hits).toHaveLength(0)
  })
})

// ─── 6. Class-based middleware ────────────────────────────────────────────────

describe('class-based middleware', () => {
  const log: string[] = []

  class LoggerMiddleware {
    use: MiddlewareFn = async (req, _ctx, next) => {
      log.push(`class:${req.method}`)
      return next()
    }
  }

  @Controller('/health')
  class HealthController {
    @Get()
    check() {
      return { ok: true }
    }
  }

  @Module({ controllers: [HealthController] })
  class AppModule {
    configure(consumer: unknown) {
      ;(
        consumer as {
          apply(...mws: unknown[]): { forRoutes(...routes: string[]): void }
        }
      )
        .apply(LoggerMiddleware)
        .forRoutes('health')
    }
  }

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('class middleware is instantiated and runs', async () => {
    log.length = 0
    const res = await fetch(`${base}/health`)
    expect(res.status).toBe(200)
    expect(log).toContain('class:GET')
  })
})

// ─── 7. Ordering is preserved ─────────────────────────────────────────────────

describe('middleware ordering', () => {
  const order: string[] = []

  const mwA: MiddlewareFn = async (_req, _ctx, next) => {
    order.push('A')
    const res = await next()
    return res
  }

  const mwB: MiddlewareFn = async (_req, _ctx, next) => {
    order.push('B')
    return next()
  }

  @Controller('/ordered')
  class OrderedController {
    @Get()
    get() {
      return { ok: true }
    }
  }

  @Module({ controllers: [OrderedController] })
  class AppModule {
    configure(consumer: unknown) {
      const c = consumer as {
        apply(...mws: MiddlewareFn[]): { forRoutes(...routes: string[]): void }
      }
      c.apply(mwA, mwB).forRoutes('ordered')
    }
  }

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('A runs before B', async () => {
    order.length = 0
    await fetch(`${base}/ordered`)
    expect(order).toEqual(['A', 'B'])
  })
})

// ─── 8. @UseMiddleware decorator ─────────────────────────────────────────────

describe('@UseMiddleware decorator', () => {
  const log: string[] = []

  const controllerMw: MiddlewareFn = async (_req, _ctx, next) => {
    log.push('controller')
    return next()
  }

  const handlerMw: MiddlewareFn = async (_req, _ctx, next) => {
    log.push('handler')
    return next()
  }

  @UseMiddleware(controllerMw)
  @Controller('/deco')
  class DecoController {
    @UseMiddleware(handlerMw)
    @Get()
    get() {
      return { ok: true }
    }

    @Get('/plain')
    plain() {
      return { plain: true }
    }
  }

  @Module({ controllers: [DecoController] })
  class AppModule {}

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('controller + handler middleware both run for decorated handler', async () => {
    log.length = 0
    const res = await fetch(`${base}/deco`)
    expect(res.status).toBe(200)
    expect(log).toContain('controller')
    expect(log).toContain('handler')
  })

  test('only controller middleware runs for plain handler', async () => {
    log.length = 0
    await fetch(`${base}/deco/plain`)
    expect(log).toContain('controller')
    expect(log).not.toContain('handler')
  })
})
