import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { RouteCtx } from '@banhmi/common'
import { Controller, Get, Injectable, Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { DevtoolsModule } from '../src/devtools.module'
import type { DiGraph } from '../src/types'

// ─── Fixture: small app ───────────────────────────────────────────────────────

@Injectable()
class CatsService {
  static inject = [] as const

  findAll() {
    return ['Whiskers', 'Luna']
  }
}

@Controller('/cats')
class CatsController {
  static inject = [CatsService] as const
  constructor(private svc: CatsService) {}

  @Get()
  list(_ctx: RouteCtx) {
    return this.svc.findAll()
  }
}

@Module({
  imports: [DevtoolsModule.forRoot()],
  providers: [CatsService],
  controllers: [CatsController],
})
class AppModule {}

// ─── Disabled variant ─────────────────────────────────────────────────────────

@Module({
  imports: [DevtoolsModule.forRoot({ enabled: false })],
  controllers: [CatsController],
  providers: [CatsService],
})
class DisabledAppModule {}

// ─── Custom path variant ──────────────────────────────────────────────────────

@Module({
  imports: [DevtoolsModule.forRoot({ path: '/_dev' })],
  controllers: [CatsController],
  providers: [CatsService],
})
class CustomPathAppModule {}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DevtoolsModule — default path', () => {
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

  test('GET /__banhmi/devtools returns HTML index', async () => {
    const res = await fetch(`${base}/__banhmi/devtools`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('Banhmi Devtools')
  })

  test('GET /__banhmi/devtools/graph.json returns valid DiGraph', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/graph.json`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as DiGraph
    expect(Array.isArray(body.nodes)).toBe(true)
    expect(Array.isArray(body.edges)).toBe(true)
    expect(body.nodes.length).toBeGreaterThan(0)
  })

  test('graph.json contains AppModule node', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/graph.json`)
    const graph = (await res.json()) as DiGraph
    const appMod = graph.nodes.find((n) => n.name === 'AppModule')
    expect(appMod).toBeDefined()
    expect(appMod?.kind).toBe('module')
  })

  test('GET /__banhmi/devtools/graph returns HTML containing module names', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/graph`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('AppModule')
    expect(body).toContain('CatsController')
  })

  test('GET /__banhmi/devtools/profile.json returns array (initially may have some timing records)', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/profile.json`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /__banhmi/devtools/profile returns HTML table', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/profile`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('Request Profile')
  })

  test('after making requests, profile.json shows records', async () => {
    // Make some requests to another route
    await fetch(`${base}/cats`)
    await fetch(`${base}/cats`)
    await fetch(`${base}/cats`)

    const res = await fetch(`${base}/__banhmi/devtools/profile.json`)
    const records = (await res.json()) as unknown[]
    // Should have at least the /cats requests captured
    expect(records.length).toBeGreaterThan(0)
  })
})

describe('DevtoolsModule — disabled', () => {
  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(DisabledAppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('GET /__banhmi/devtools returns 404 when disabled', async () => {
    const res = await fetch(`${base}/__banhmi/devtools`)
    expect(res.status).toBe(404)
  })

  test('GET /__banhmi/devtools/graph.json returns 404 when disabled', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/graph.json`)
    expect(res.status).toBe(404)
  })
})

describe('DevtoolsModule — custom path', () => {
  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(CustomPathAppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('custom path /_dev/graph.json is reachable', async () => {
    const res = await fetch(`${base}/_dev/graph.json`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as DiGraph
    expect(Array.isArray(body.nodes)).toBe(true)
  })

  test('default path /__banhmi/devtools/graph.json returns 404 with custom path', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/graph.json`)
    expect(res.status).toBe(404)
  })
})
