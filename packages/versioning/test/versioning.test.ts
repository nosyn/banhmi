import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Controller, Get, Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { Version } from '../src/version.decorator'
import { VersioningModule } from '../src/versioning.module'

// ─── URI versioning ───────────────────────────────────────────────────────────

describe('URI versioning', () => {
  @Version('1')
  @Controller('/cats')
  class CatsV1Controller {
    @Get()
    findAll() {
      return { version: 1, cats: ['Kitty'] }
    }
  }

  @Version('2')
  @Controller('/cats')
  class CatsV2Controller {
    @Get()
    findAll() {
      return { version: 2, cats: ['Luna', 'Mochi'] }
    }
  }

  @Module({
    imports: [VersioningModule.forRoot({ type: 'uri', prefix: 'v' })],
    controllers: [CatsV1Controller, CatsV2Controller],
  })
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

  test('/v1/cats returns version 1 response', async () => {
    const res = await fetch(`${base}/v1/cats`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { version: number }
    expect(body.version).toBe(1)
  })

  test('/v2/cats returns version 2 response', async () => {
    const res = await fetch(`${base}/v2/cats`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { version: number }
    expect(body.version).toBe(2)
  })

  test('/v3/cats (no match) returns 404', async () => {
    const res = await fetch(`${base}/v3/cats`)
    expect(res.status).toBe(404)
  })
})

// ─── Header versioning ────────────────────────────────────────────────────────

describe('Header versioning', () => {
  @Version('1')
  @Controller('/items')
  class ItemsV1Controller {
    @Get()
    list() {
      return { version: 1 }
    }
  }

  @Version('2')
  @Controller('/items')
  class ItemsV2Controller {
    @Get()
    list() {
      return { version: 2 }
    }
  }

  @Module({
    imports: [
      VersioningModule.forRoot({ type: 'header', header: 'X-API-Version' }),
    ],
    controllers: [ItemsV1Controller, ItemsV2Controller],
  })
  class HeaderAppModule {}

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(HeaderAppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('X-API-Version: 1 routes to v1 controller', async () => {
    const res = await fetch(`${base}/items`, {
      headers: { 'X-API-Version': '1' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { version: number }
    expect(body.version).toBe(1)
  })

  test('X-API-Version: 2 routes to v2 controller', async () => {
    const res = await fetch(`${base}/items`, {
      headers: { 'X-API-Version': '2' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { version: number }
    expect(body.version).toBe(2)
  })

  test('missing header returns 404 when no default', async () => {
    const res = await fetch(`${base}/items`)
    expect(res.status).toBe(404)
  })
})

// ─── Default version fallback ─────────────────────────────────────────────────

describe('Default version fallback', () => {
  @Version('1')
  @Controller('/things')
  class ThingsController {
    @Get()
    list() {
      return { ok: true }
    }
  }

  @Module({
    imports: [
      VersioningModule.forRoot({
        type: 'header',
        header: 'X-API-Version',
        defaultVersion: '1',
      }),
    ],
    controllers: [ThingsController],
  })
  class DefaultVersionApp {}

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(DefaultVersionApp)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('omitting header applies defaultVersion and matches', async () => {
    const res = await fetch(`${base}/things`)
    expect(res.status).toBe(200)
  })
})

// ─── Unversioned handler fallback ─────────────────────────────────────────────

describe('Unversioned handler is always matched', () => {
  @Controller('/open')
  class OpenController {
    @Get()
    get() {
      return { open: true }
    }
  }

  @Module({
    imports: [VersioningModule.forRoot({ type: 'uri', prefix: 'v' })],
    controllers: [OpenController],
  })
  class OpenApp {}

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(OpenApp)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('unversioned route matches regardless of version prefix', async () => {
    // No version prefix in path, but versioning is active
    const res = await fetch(`${base}/open`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { open: boolean }
    expect(body.open).toBe(true)
  })
})

// ─── Method-level @Version ───────────────────────────────────────────────────

describe('Method-level @Version', () => {
  @Controller('/notes')
  class NotesController {
    @Version('1')
    @Get()
    getV1() {
      return { v: 1 }
    }

    @Version('2')
    @Get()
    getV2() {
      return { v: 2 }
    }
  }

  @Module({
    imports: [
      VersioningModule.forRoot({ type: 'header', header: 'Accept-Version' }),
    ],
    controllers: [NotesController],
  })
  class NotesApp {}

  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(NotesApp)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('Accept-Version: 1 routes to v1 method', async () => {
    const res = await fetch(`${base}/notes`, {
      headers: { 'Accept-Version': '1' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { v: number }
    expect(body.v).toBe(1)
  })

  test('Accept-Version: 2 routes to v2 method', async () => {
    const res = await fetch(`${base}/notes`, {
      headers: { 'Accept-Version': '2' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { v: number }
    expect(body.v).toBe(2)
  })
})
