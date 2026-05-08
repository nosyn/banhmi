import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from 'bun:test'
import {
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Post,
  StreamableFile,
  Token,
  UseGuards,
} from '@banhmi/common'
import { BanhmiFactory } from '../src/factory'

const CATS_STORE_TOKEN = Token('cats-store')
@Injectable()
class CatsService {
  store
  static inject = [CATS_STORE_TOKEN]
  constructor(store) {
    this.store = store
  }
  findAll() {
    return [...this.store.values()]
  }
  findById(id) {
    const cat = this.store.get(id)
    if (!cat) throw new NotFoundException(`Cat #${id} not found`)
    return cat
  }
  create(name) {
    const id = this.store.size + 1
    const cat = { id, name }
    this.store.set(id, cat)
    return cat
  }
}
// ─── Controller ──────────────────────────────────────────────────────────────
@Controller('/cats')
class CatsController {
  cats
  static inject = [CatsService]
  constructor(cats) {
    this.cats = cats
  }
  @Get()
  findAll(_ctx) {
    return this.cats.findAll()
  }
  @Get('/:id')
  findOne(ctx) {
    return this.cats.findById(Number(ctx.params.id))
  }
  @Post()
  @HttpCode(201)
  async create(ctx) {
    const { name } = await ctx.json()
    return this.cats.create(name)
  }
}
// ─── Module ──────────────────────────────────────────────────────────────────
@Module({
  controllers: [CatsController],
  providers: [CatsService, { provide: CATS_STORE_TOKEN, useValue: new Map() }],
})
class AppModule {}
// ─── Tests ───────────────────────────────────────────────────────────────────
let app
const PORT = 54321
const BASE = `http://localhost:${PORT}`
beforeAll(async () => {
  app = await BanhmiFactory.create(AppModule)
  await app.listen(PORT)
})
afterAll(async () => {
  await app.close()
})
describe('GET /cats', () => {
  test('returns empty array initially', async () => {
    const res = await fetch(`${BASE}/cats`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})
describe('POST /cats', () => {
  test('creates a cat and returns 201', async () => {
    const res = await fetch(`${BASE}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Whiskers' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Whiskers')
    expect(body.id).toBe(1)
  })
})
describe('GET /cats/:id', () => {
  let seededId
  beforeAll(async () => {
    const res = await fetch(`${BASE}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Whiskers' }),
    })
    const body = await res.json()
    seededId = body.id
  })
  test('returns the cat by id', async () => {
    const res = await fetch(`${BASE}/cats/${seededId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Whiskers')
  })
  test('returns 404 for unknown cat', async () => {
    const res = await fetch(`${BASE}/cats/999`)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.message).toContain('not found')
  })
})
describe('404 handling', () => {
  test('unknown route returns 404', async () => {
    const res = await fetch(`${BASE}/unknown`)
    expect(res.status).toBe(404)
  })
})
describe('middleware intercepts unmatched routes', () => {
  let middlewareApp
  beforeAll(async () => {
    middlewareApp = await BanhmiFactory.create(AppModule)
    middlewareApp.use(async (req, next) => {
      const url = new URL(req.url)
      if (url.pathname === '/intercept') {
        return Response.json({ intercepted: true })
      }
      return next()
    })
    await middlewareApp.listen(54399)
  })
  afterAll(async () => {
    await middlewareApp.close()
  })
  test('middleware can handle routes not in the router', async () => {
    const res = await fetch('http://localhost:54399/intercept')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ intercepted: true })
  })
})
describe('method-level guard only blocks its own route, not siblings', () => {
  let methodGuardApp
  const METHOD_GUARD_PORT = 54400
  let guardCalled = false
  beforeAll(async () => {
    class StrictGuard {
      async canActivate(_ctx) {
        guardCalled = true
        return false
      }
    }
    @Controller('/method-guard-test')
    class MethodGuardController {
      @UseGuards(StrictGuard)
      @Get('/blocked')
      blocked() {
        return { ok: true }
      }
      @Get('/allowed')
      allowed() {
        return { ok: true }
      }
    }
    @Module({ controllers: [MethodGuardController] })
    class MethodGuardApp {}
    methodGuardApp = await BanhmiFactory.create(MethodGuardApp)
    await methodGuardApp.listen(METHOD_GUARD_PORT)
  })
  afterAll(async () => {
    await methodGuardApp.close()
  })
  test('blocked route returns 403 when method guard denies', async () => {
    const res = await fetch(
      `http://localhost:${METHOD_GUARD_PORT}/method-guard-test/blocked`,
    )
    expect(res.status).toBe(403)
    expect(guardCalled).toBe(true)
  })
  test('allowed route returns 200 and guard is not called', async () => {
    guardCalled = false
    const res = await fetch(
      `http://localhost:${METHOD_GUARD_PORT}/method-guard-test/allowed`,
    )
    expect(res.status).toBe(200)
    expect(guardCalled).toBe(false)
  })
})
describe('StreamableFile responses', () => {
  let streamApp = null
  afterEach(async () => {
    await streamApp?.close()
    streamApp = null
  })
  test('streams text from a StreamableFile', async () => {
    @Controller('/stream-test')
    class StreamController {
      @Get('/text')
      getText() {
        return StreamableFile.fromText('hello from stream')
      }
    }
    @Module({ controllers: [StreamController] })
    class TestApp {}
    streamApp = await BanhmiFactory.create(TestApp)
    const port = 54405
    await streamApp.listen(port)
    const res = await fetch(`http://localhost:${port}/stream-test/text`)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toBe('hello from stream')
  })
  test('sets Content-Type from StreamableFile options', async () => {
    @Controller('/stream-test2')
    class StreamController2 {
      @Get('/pdf')
      getPdf() {
        return new StreamableFile(
          new ReadableStream({
            start(c) {
              c.enqueue(new TextEncoder().encode('%PDF'))
              c.close()
            },
          }),
          { contentType: 'application/pdf' },
        )
      }
    }
    @Module({ controllers: [StreamController2] })
    class TestApp2 {}
    streamApp = await BanhmiFactory.create(TestApp2)
    const port = 54406
    await streamApp.listen(port)
    const res = await fetch(`http://localhost:${port}/stream-test2/pdf`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')
  })
})
