import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module, Post } from 'banhmi'
import { CsrfModule } from '../src/csrf/csrf.module'

@Controller()
class TestController {
  @Get('/')
  index() {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  @Post('/submit')
  submit() {
    return new Response(JSON.stringify({ submitted: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({
    imports: [CsrfModule.forRoot()],
    controllers: [TestController],
  })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

// Helper: extract csrf-token value from set-cookie header
function extractCsrfCookie(setCookie: string | null): string | null {
  if (!setCookie) return null
  const match = setCookie.match(/csrf-token=([^;]+)/)
  return match ? decodeURIComponent(match[1] ?? '') : null
}

test('csrf: GET issues csrf-token cookie', async () => {
  const res = await fetch(`${base}/`)
  const setCookie = res.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()
  expect(setCookie).toContain('csrf-token=')
})

test('csrf: GET sets x-csrf-token response header', async () => {
  const res = await fetch(`${base}/`)
  const token = res.headers.get('x-csrf-token')
  expect(token).toBeTruthy()
  expect(token?.length).toBeGreaterThan(0)
})

test('csrf: GET with existing cookie does not re-set cookie', async () => {
  const first = await fetch(`${base}/`)
  const setCookie = first.headers.get('set-cookie') ?? ''
  const token = extractCsrfCookie(setCookie) ?? ''
  const cookieHeader = `csrf-token=${encodeURIComponent(token)}`

  const second = await fetch(`${base}/`, {
    headers: { cookie: cookieHeader },
  })
  // x-csrf-token should still be reflected
  expect(second.headers.get('x-csrf-token')).toBe(token)
})

test('csrf: POST without header returns 403', async () => {
  // First get a token
  const getRes = await fetch(`${base}/`)
  const setCookie = getRes.headers.get('set-cookie') ?? ''
  const token = extractCsrfCookie(setCookie) ?? ''

  // POST with cookie but no header
  const res = await fetch(`${base}/submit`, {
    method: 'POST',
    headers: {
      cookie: `csrf-token=${encodeURIComponent(token)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  expect(res.status).toBe(403)
  const body = await res.json()
  expect(body.message).toBe('CSRF token mismatch')
})

test('csrf: POST without cookie returns 403', async () => {
  const res = await fetch(`${base}/submit`, {
    method: 'POST',
    headers: {
      'x-csrf-token': 'some-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  expect(res.status).toBe(403)
})

test('csrf: POST with matching header and cookie succeeds', async () => {
  // Get the token
  const getRes = await fetch(`${base}/`)
  const setCookie = getRes.headers.get('set-cookie') ?? ''
  const token = extractCsrfCookie(setCookie) ?? ''

  // POST with both cookie and matching header
  const res = await fetch(`${base}/submit`, {
    method: 'POST',
    headers: {
      cookie: `csrf-token=${encodeURIComponent(token)}`,
      'x-csrf-token': token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.submitted).toBe(true)
})

test('csrf: POST with mismatched header returns 403', async () => {
  // Get the token
  const getRes = await fetch(`${base}/`)
  const setCookie = getRes.headers.get('set-cookie') ?? ''
  const token = extractCsrfCookie(setCookie) ?? ''

  const res = await fetch(`${base}/submit`, {
    method: 'POST',
    headers: {
      cookie: `csrf-token=${encodeURIComponent(token)}`,
      'x-csrf-token': 'wrong-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  expect(res.status).toBe(403)
})
