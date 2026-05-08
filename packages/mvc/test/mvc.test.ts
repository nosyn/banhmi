import { afterAll, beforeAll, expect, mock, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module } from 'banhmi'
import { registerEngine } from '../src/registry'
import { RENDER_ENGINE_STATE_KEY, Render } from '../src/render.decorator'
import type { ViewEngine } from '../src/types'

// ---------------------------------------------------------------------------
// Unit: etaEngine mock
// ---------------------------------------------------------------------------

test('etaEngine: lazy-imports eta and renders template', async () => {
  mock.module('eta', () => ({
    Eta: class MockEta {
      renderFile(path: string, data: Record<string, unknown>): Promise<string> {
        // Simulate eta rendering: replace {varname} with data[varname]
        if (path === 'hello') {
          const name = data.name ?? ''
          return Promise.resolve(`Hello, ${name}!`)
        }
        return Promise.resolve(`rendered:${path}`)
      }
    },
  }))

  const { etaEngine } = await import('../src/engines/eta')
  const engine = etaEngine({ viewsDir: '/views' })
  const result = await engine.render('hello', { name: 'banh' })
  expect(result).toBe('Hello, banh!')
})

test('etaEngine: missing template throws clear error', async () => {
  mock.module('eta', () => ({
    Eta: class MockEta {
      renderFile(
        _path: string,
        _data: Record<string, unknown>,
      ): Promise<string | null> {
        return Promise.resolve(null)
      }
    },
  }))

  const { etaEngine } = await import('../src/engines/eta')
  const engine = etaEngine({ viewsDir: '/views' })
  await expect(engine.render('missing', {})).rejects.toThrow(
    "template 'missing' not found",
  )
})

// ---------------------------------------------------------------------------
// Unit: @Render decorator
// ---------------------------------------------------------------------------

test('@Render: throws when no engine is registered', async () => {
  @Controller()
  class NoEngineController {
    @Get('/no-engine')
    @Render('hello')
    handler() {
      return { name: 'world' }
    }
  }

  // Create a mock ctx without engine — and without state engine key
  // Temporarily null out the registry
  const savedEngine = (await import('../src/registry')).getActiveEngine()
  registerEngine(null as unknown as ViewEngine)

  const mockCtx = {
    state: {},
    headers: new Headers(),
    params: {},
    query: new URLSearchParams(),
    ip: '127.0.0.1',
    json: async () => ({}),
    text: async () => '',
    formData: async () => new FormData(),
    request: new Request('http://localhost/no-engine'),
  }

  const ctrl = new NoEngineController()
  try {
    await expect(
      (
        ctrl as unknown as Record<
          string,
          (ctx: typeof mockCtx) => Promise<unknown>
        >
      ).handler(mockCtx),
    ).rejects.toThrow('no view engine found')
  } finally {
    // Restore engine for subsequent tests
    if (savedEngine) registerEngine(savedEngine)
  }
})

test('@Render: sets Content-Type to text/html and renders template', async () => {
  const mockEngine: ViewEngine = {
    render: async (template, locals) => {
      const name = (locals as { name?: string }).name ?? ''
      return `<h1>${template}: ${name}</h1>`
    },
  }

  @Controller()
  class RenderController {
    @Get('/hello')
    @Render('hello')
    handler() {
      return { name: 'banh' }
    }
  }

  const mockCtx = {
    state: { [RENDER_ENGINE_STATE_KEY]: mockEngine },
    headers: new Headers(),
    params: {},
    query: new URLSearchParams(),
    ip: '127.0.0.1',
    json: async () => ({}),
    text: async () => '',
    formData: async () => new FormData(),
    request: new Request('http://localhost/hello'),
  }

  const ctrl = new RenderController()
  const res = await (
    ctrl as unknown as Record<
      string,
      (ctx: typeof mockCtx) => Promise<Response>
    >
  ).handler(mockCtx)

  expect(res).toBeInstanceOf(Response)
  expect(res.headers.get('content-type')).toContain('text/html')
  expect(await res.text()).toBe('<h1>hello: banh</h1>')
})

// ---------------------------------------------------------------------------
// Integration: MvcModule + @Render + full server
// ---------------------------------------------------------------------------

let app: BanhmiApplication
let base: string

const mockViewEngine: ViewEngine = {
  render: async (template, locals) => {
    const name = (locals as { name?: string }).name ?? 'world'
    return `<html><body>${template}:${name}</body></html>`
  },
}

@Controller()
class IntegrationController {
  @Get('/page')
  @Render('page')
  page() {
    return { name: 'banhmi' }
  }

  @Get('/raw')
  raw() {
    return { ok: true }
  }
}

beforeAll(async () => {
  const { MvcModule } = await import('../src/mvc.module')

  @Module({
    imports: [MvcModule.forRoot({ engine: mockViewEngine })],
    controllers: [IntegrationController],
  })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

test('MvcModule integration: GET /page returns text/html', async () => {
  const res = await fetch(`${base}/page`)
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('text/html')
  const body = await res.text()
  expect(body).toContain('banhmi')
})

test('MvcModule integration: GET /raw returns JSON (unaffected by MvcModule)', async () => {
  const res = await fetch(`${base}/raw`)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect((data as { ok: boolean }).ok).toBe(true)
})
