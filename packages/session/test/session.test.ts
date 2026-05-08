import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { RouteCtx } from '@banhmi/common'
import { Controller, Get, Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { Session } from '../src/session.decorator'
import { getSession } from '../src/session.middleware'
import { SessionModule } from '../src/session.module'
import { MemorySessionStore } from '../src/stores/memory'

// ─── Shared secret ───────────────────────────────────────────────────────────

const SECRET = 'test-secret-for-session'

// ─── Test app ────────────────────────────────────────────────────────────────

const sharedStore = new MemorySessionStore()

@Controller()
class SessionController {
  @Get('/counter')
  @Session({ secret: SECRET, store: sharedStore })
  async counter(ctx: RouteCtx) {
    const s = getSession(ctx)
    const count = (s.get<number>('count') ?? 0) + 1
    s.set('count', count)
    return { count, id: s.id }
  }

  @Get('/destroy')
  @Session({ secret: SECRET, store: sharedStore })
  async destroySession(ctx: RouteCtx) {
    const s = getSession(ctx)
    await s.destroy()
    return { destroyed: true }
  }

  @Get('/regenerate')
  @Session({ secret: SECRET, store: sharedStore })
  async regenerateSession(ctx: RouteCtx) {
    const s = getSession(ctx)
    const oldId = s.id
    s.set('regen', true)
    await s.regenerate()
    return { oldId, newId: s.id }
  }
}

@Module({
  imports: [
    SessionModule.forRoot({
      secret: SECRET,
      store: sharedStore,
      cookie: { maxAge: 3600 },
    }),
  ],
  controllers: [SessionController],
})
class TestAppModule {}

// ─── Server lifecycle ────────────────────────────────────────────────────────

let app: BanhmiApplication
let baseUrl: string

beforeAll(async () => {
  app = await BanhmiFactory.create(TestAppModule)
  await app.listen(0)
  baseUrl = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Extract raw cookie value from a Set-Cookie header (before first ';'). */
function extractCookie(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? ''
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('@banhmi/session — integration', () => {
  describe('counter session', () => {
    test('first request returns count=1 and sets a cookie', async () => {
      const res = await fetch(`${baseUrl}/counter`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.count).toBe(1)
      const setCookie = res.headers.get('set-cookie')
      expect(setCookie).toBeTruthy()
      expect(setCookie).toContain('banhmi.sid=')
      expect(setCookie).toContain('HttpOnly')
    })

    test('second request with same cookie returns count=2', async () => {
      // First request
      const r1 = await fetch(`${baseUrl}/counter`)
      const cookie = extractCookie(r1.headers.get('set-cookie') ?? '')

      // Second request with same session cookie
      const r2 = await fetch(`${baseUrl}/counter`, {
        headers: { cookie },
      })
      expect(r2.status).toBe(200)
      const body = await r2.json()
      expect(body.count).toBe(2)
    })

    test('same session id is reused across requests', async () => {
      const r1 = await fetch(`${baseUrl}/counter`)
      const cookie = extractCookie(r1.headers.get('set-cookie') ?? '')
      const b1 = await r1.json()

      const r2 = await fetch(`${baseUrl}/counter`, { headers: { cookie } })
      const b2 = await r2.json()

      expect(b1.id).toBe(b2.id)
    })
  })

  describe('destroy', () => {
    test('destroy sends an expiry cookie (Max-Age=0)', async () => {
      const r1 = await fetch(`${baseUrl}/counter`)
      const cookie = extractCookie(r1.headers.get('set-cookie') ?? '')

      const r2 = await fetch(`${baseUrl}/destroy`, { headers: { cookie } })
      expect(r2.status).toBe(200)
      const setCookie = r2.headers.get('set-cookie') ?? ''
      expect(setCookie).toContain('Max-Age=0')
    })

    test('after destroy the session data is cleared', async () => {
      const r1 = await fetch(`${baseUrl}/counter`)
      const cookie = extractCookie(r1.headers.get('set-cookie') ?? '')
      const b1 = await r1.json()

      // Destroy the session
      await fetch(`${baseUrl}/destroy`, { headers: { cookie } })

      // Now attempt to use the same cookie — store should be empty
      const r3 = await fetch(`${baseUrl}/counter`, { headers: { cookie } })
      const b3 = await r3.json()
      // Either the old session was empty (count=1) or it's a fresh session
      expect(b3.count).toBe(1)
      // New session id should have been issued
      expect(b3.id).not.toBe(b1.id)
    })
  })

  describe('regenerate', () => {
    test('regenerate returns a different session id', async () => {
      const r1 = await fetch(`${baseUrl}/counter`)
      const cookie = extractCookie(r1.headers.get('set-cookie') ?? '')
      const b1 = await r1.json()

      const r2 = await fetch(`${baseUrl}/regenerate`, { headers: { cookie } })
      expect(r2.status).toBe(200)
      const b2 = await r2.json()
      expect(b2.oldId).toBe(b1.id)
      expect(b2.newId).not.toBe(b1.id)
    })
  })
})
