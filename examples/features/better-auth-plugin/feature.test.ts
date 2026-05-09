/**
 * Feature tests for @banhmi/better-auth plugin example.
 *
 * We intercept better-auth's get-session calls at the server level by setting
 * up the mock before the app starts, so the client factory sees our mock fetch.
 *
 * Tests cover:
 *  1. GET /me without session cookie → 401.
 *  2. GET /me with a valid session cookie → 200 with user data.
 *  3. GET /ping always succeeds; returns ok:true.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './index'

let app: BanhmiApplication
let base: string

const SESSION_COOKIE = 'better-auth.session_token=valid-tok'
const MOCK_SESSION = {
  user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
  session: { id: 's1', userId: 'u1', expiresAt: '2099-01-01T00:00:00Z' },
}

// We capture the native fetch once and build a router around it.
// The native fetch handles all real TCP connections (test server calls).
// We intercept only /api/auth/get-session calls.
const nativeFetch = globalThis.fetch
let respondWithSession = true

beforeAll(async () => {
  // Install the interceptor BEFORE creating the app so the DI client picks
  // up our version of fetch.
  globalThis.fetch = async (
    url: string | Request | URL,
    init?: RequestInit,
  ) => {
    const urlStr =
      typeof url === 'string'
        ? url
        : url instanceof URL
          ? url.toString()
          : (url as Request).url

    if (urlStr.includes('/api/auth/get-session')) {
      if (respondWithSession) {
        return new Response(JSON.stringify(MOCK_SESSION), {
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response('Unauthorized', { status: 401 })
    }

    // All other requests — e.g. test HTTP calls to the Bun server — pass through.
    return nativeFetch(url as string, init)
  }

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  globalThis.fetch = nativeFetch
  await app.close()
})

// ─── 1. Protected route without session ──────────────────────────────────────

describe('GET /me', () => {
  test('returns 401 when better-auth returns no session', async () => {
    respondWithSession = false
    const res = await nativeFetch(`${base}/me`)
    respondWithSession = true
    expect(res.status).toBe(401)
  })

  test('returns 200 with user data when session cookie is valid', async () => {
    respondWithSession = true
    const res = await nativeFetch(`${base}/me`, {
      headers: { cookie: SESSION_COOKIE },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toBeTruthy()
    expect(body.user.id).toBe('u1')
    expect(body.user.email).toBe('alice@example.com')
  })
})

// ─── 2. Public route ─────────────────────────────────────────────────────────

describe('GET /ping', () => {
  test('returns 200 with ok:true', async () => {
    const res = await nativeFetch(`${base}/ping`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
