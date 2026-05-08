/**
 * Integration tests for the better-auth-api wave-2 cluster app.
 *
 * Covers:
 *  1. Helmet — security headers on a typical GET response.
 *  2. CORS preflight — returns 204 with the correct Allow-* headers.
 *  3. CSRF — GET issues cookie; unauthorized POST without token gets 403.
 *  4. Throttler — 6 rapid requests to a limit-5 endpoint; the 6th gets 429.
 *  5. @UseAuth('jwt') — /api/profile without JWT → 401; with valid JWT → 200.
 *  6. hashPassword / verifyPassword — round-trip through /api/legacy/register
 *     and /api/legacy/login.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { JwtService } from '@banhmi/jwt'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from '../src/app.module'

let app: BanhmiApplication
let base: string

// Override the ThrottlerModule storage key generator at the module level is
// not needed — we just use fixed IP-less key by sending a fixed x-forwarded-for
// header in throttle tests.

beforeAll(async () => {
  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
  // Seed the JWT_SECRET so JwtStrategy can verify
  Bun.env.JWT_SECRET = 'test-jwt-secret'
})

afterAll(async () => {
  await app.close()
})

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Extract the csrf-token cookie value from a set-cookie header. */
function extractCsrfCookie(setCookie: string | null): string | null {
  if (!setCookie) return null
  const match = setCookie.match(/csrf-token=([^;]+)/)
  return match ? decodeURIComponent(match[1] ?? '') : null
}

/** Sign a test JWT with the shared secret. */
async function signTestJwt(payload: Record<string, unknown>): Promise<string> {
  const svc = new JwtService({ secret: 'dev-jwt-secret-change-in-prod' })
  return svc.sign(payload)
}

// ─── 1. Helmet ───────────────────────────────────────────────────────────────

describe('helmet', () => {
  test('GET /users/ping includes X-Content-Type-Options: nosniff', async () => {
    const res = await fetch(`${base}/users/ping`)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  test('GET /users/ping includes X-Frame-Options', async () => {
    const res = await fetch(`${base}/users/ping`)
    expect(res.headers.get('x-frame-options')).toBeTruthy()
  })

  test('GET /users/ping includes Referrer-Policy', async () => {
    const res = await fetch(`${base}/users/ping`)
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
  })
})

// ─── 2. CORS preflight ───────────────────────────────────────────────────────

describe('cors', () => {
  test('OPTIONS preflight returns 204 with Allow-Origin header', async () => {
    const res = await fetch(`${base}/users/ping`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    })
    expect(res.status).toBe(204)
    const acao = res.headers.get('access-control-allow-origin')
    expect(acao).toBe('http://localhost:3000')
  })

  test('OPTIONS preflight returns Access-Control-Allow-Credentials', async () => {
    const res = await fetch(`${base}/users/ping`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    })
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })
})

// ─── 3. CSRF ─────────────────────────────────────────────────────────────────

describe('csrf', () => {
  test('GET /users/ping issues a csrf-token cookie', async () => {
    const res = await fetch(`${base}/users/ping`)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain('csrf-token=')
  })

  test('POST /api/legacy/register without CSRF token returns 403', async () => {
    // Obtain cookie first
    const getRes = await fetch(`${base}/users/ping`)
    const setCookie = getRes.headers.get('set-cookie') ?? ''
    const token = extractCsrfCookie(setCookie) ?? ''

    // POST with cookie but without x-csrf-token header
    const res = await fetch(`${base}/api/legacy/register`, {
      method: 'POST',
      headers: {
        cookie: `csrf-token=${encodeURIComponent(token)}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: 'x@x.com', password: 'pass' }),
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.message).toBe('CSRF token mismatch')
  })
})

// ─── 4. Throttler ────────────────────────────────────────────────────────────

describe('throttler', () => {
  test('6 rapid requests to limit-5 endpoint; 6th returns 429', async () => {
    // Use a fixed unique IP so all requests count against the same bucket.
    // The LegacyController applies @Throttle({ ttl: 60_000, limit: 5 }).
    // We need to make 5 successful requests then hit the limit.
    // Each test run may start from non-zero if storage is shared — use a
    // unique IP per test run to isolate.
    const uniqueIp = `10.0.0.${Math.floor(Math.random() * 200) + 1}`

    // Obtain CSRF token to pass POST checks
    const getRes = await fetch(`${base}/users/ping`)
    const setCookie = getRes.headers.get('set-cookie') ?? ''
    const csrfToken = extractCsrfCookie(setCookie) ?? ''

    const headers = {
      'x-forwarded-for': uniqueIp,
      cookie: `csrf-token=${encodeURIComponent(csrfToken)}`,
      'x-csrf-token': csrfToken,
      'content-type': 'application/json',
    }

    // Make 5 requests (should all succeed, might conflict with shared
    // module-level limit=30 but @Throttle override is limit=5)
    let lastStatus = 0
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${base}/api/legacy/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: `u${i}@${uniqueIp}.test`,
          password: 'pw',
        }),
      })
      lastStatus = res.status
    }
    // The 6th request must be 429
    expect(lastStatus).toBe(429)
  })
})

// ─── 5. @UseAuth('jwt') ───────────────────────────────────────────────────────

describe('@UseAuth jwt', () => {
  test('GET /api/profile without JWT returns 401', async () => {
    const res = await fetch(`${base}/api/profile`)
    expect(res.status).toBe(401)
  })

  test('GET /api/profile with valid JWT returns 200 and principal', async () => {
    const token = await signTestJwt({
      sub: 'user-123',
      email: 'test@example.com',
    })
    const res = await fetch(`${base}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.principal).toBeTruthy()
    expect(body.principal.sub).toBe('user-123')
  })

  test('GET /api/profile with invalid JWT returns 401', async () => {
    const res = await fetch(`${base}/api/profile`, {
      headers: { Authorization: 'Bearer not.a.valid.jwt' },
    })
    expect(res.status).toBe(401)
  })
})

// ─── 6. hashPassword / verifyPassword round-trip ─────────────────────────────

describe('crypto — hashPassword / verifyPassword', () => {
  // We need to issue CSRF tokens for the POST endpoints
  let csrfToken: string
  let csrfCookieHeader: string

  beforeAll(async () => {
    const getRes = await fetch(`${base}/users/ping`)
    const setCookie = getRes.headers.get('set-cookie') ?? ''
    csrfToken = extractCsrfCookie(setCookie) ?? ''
    csrfCookieHeader = `csrf-token=${encodeURIComponent(csrfToken)}`
  })

  function postWithCsrf(path: string, body: unknown) {
    return fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: csrfCookieHeader,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(body),
    })
  }

  test('POST /api/legacy/register stores hashed password and returns 201', async () => {
    const res = await postWithCsrf('/api/legacy/register', {
      email: 'alice@example.com',
      password: 'correct-horse-battery',
    })
    expect(res.status).toBe(201)
  })

  test('POST /api/legacy/login with correct password returns 200', async () => {
    const res = await postWithCsrf('/api/legacy/login', {
      email: 'alice@example.com',
      password: 'correct-horse-battery',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('ok')
    expect(body.email).toBe('alice@example.com')
  })

  test('POST /api/legacy/login with wrong password returns 401', async () => {
    const res = await postWithCsrf('/api/legacy/login', {
      email: 'alice@example.com',
      password: 'wrong-password',
    })
    expect(res.status).toBe(401)
  })

  test('POST /api/legacy/login with unknown email returns 401', async () => {
    const res = await postWithCsrf('/api/legacy/login', {
      email: 'nobody@example.com',
      password: 'anything',
    })
    expect(res.status).toBe(401)
  })
})
