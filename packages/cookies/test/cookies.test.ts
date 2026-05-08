import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { RouteCtx } from '@banhmi/common'
import { Controller, Get, Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import {
  Cookie,
  Cookies,
  getCookie,
  getCookies,
  getSignedCookie,
  SignedCookie,
  serializeCookie,
  signValue,
} from '../src'

const SECRET = 'integration-test-secret'

// ─── Integration controller ───────────────────────────────────────────────────

@Controller('/test')
class TestController {
  @Get('/all')
  @Cookies()
  allCookies(ctx: RouteCtx) {
    return { cookies: getCookies(ctx) }
  }

  @Get('/one')
  @Cookie('uid')
  oneCookie(ctx: RouteCtx) {
    return { uid: getCookie(ctx, 'uid') }
  }

  @Get('/signed')
  @SignedCookie('uid', SECRET)
  signedCookie(ctx: RouteCtx) {
    return { uid: getSignedCookie(ctx, 'uid') }
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({ controllers: [TestController] })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

// ─── @Cookies() ──────────────────────────────────────────────────────────────

test('@Cookies() returns all parsed cookies from the request', async () => {
  const res = await fetch(`${base}/test/all`, {
    headers: { cookie: 'uid=abc; token=xyz' },
  })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.cookies.uid).toBe('abc')
  expect(body.cookies.token).toBe('xyz')
})

test('@Cookies() returns empty object when no Cookie header', async () => {
  const res = await fetch(`${base}/test/all`)
  const body = await res.json()
  expect(body.cookies).toEqual({})
})

// ─── @Cookie('name') ─────────────────────────────────────────────────────────

test('@Cookie("uid") returns the named cookie value', async () => {
  const res = await fetch(`${base}/test/one`, {
    headers: { cookie: 'uid=user-123' },
  })
  const body = await res.json()
  expect(body.uid).toBe('user-123')
})

test('@Cookie("uid") returns undefined when cookie is absent', async () => {
  const res = await fetch(`${base}/test/one`)
  const body = await res.json()
  expect(body.uid).toBeUndefined()
})

// ─── @SignedCookie('name') ────────────────────────────────────────────────────

test('@SignedCookie("uid") returns verified value for valid signed cookie', async () => {
  const signed = await signValue('user-123', SECRET)
  const res = await fetch(`${base}/test/signed`, {
    headers: { cookie: `uid=${encodeURIComponent(signed)}` },
  })
  const body = await res.json()
  expect(body.uid).toBe('user-123')
})

test('@SignedCookie("uid") returns null for unsigned cookie', async () => {
  const res = await fetch(`${base}/test/signed`, {
    headers: { cookie: 'uid=user-123' }, // not signed
  })
  const body = await res.json()
  expect(body.uid).toBeNull()
})

test('@SignedCookie("uid") returns null when cookie is absent', async () => {
  const res = await fetch(`${base}/test/signed`)
  const body = await res.json()
  expect(body.uid).toBeNull()
})

// ─── Set-Cookie round-trip ────────────────────────────────────────────────────

test('serializeCookie produces a Set-Cookie value parseable by parseCookies', async () => {
  // Sign a value
  const signed = await signValue('round-trip', SECRET)
  // Serialize to Set-Cookie header
  const setCookie = serializeCookie('uid', signed, {
    httpOnly: true,
    path: '/',
  })
  expect(setCookie).toContain('uid=')
  expect(setCookie).toContain('HttpOnly')
  expect(setCookie).toContain('Path=/')
})
