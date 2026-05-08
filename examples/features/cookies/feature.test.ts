import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './index'

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

test('cookies: GET /set returns a Set-Cookie header', async () => {
  const res = await fetch(`${base}/set`)
  expect(res.status).toBe(200)
  const setCookie = res.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()
  expect(setCookie).toContain('uid=')
  expect(setCookie).toContain('HttpOnly')
})

test('cookies: signed cookie round-trips via GET /me', async () => {
  // Step 1: get the signed cookie from /set
  const setRes = await fetch(`${base}/set`)
  const rawCookieHeader = setRes.headers.get('set-cookie') ?? ''
  // Extract the cookie value (before first ';')
  const cookieValue = rawCookieHeader.split(';')[0] ?? ''

  // Step 2: send it back in the Cookie header to /me
  const meRes = await fetch(`${base}/me`, {
    headers: { cookie: cookieValue },
  })
  expect(meRes.status).toBe(200)
  const body = await meRes.json()
  expect(body.uid).toBe('demo-user')
})

test('cookies: unsigned cookie returns null from @SignedCookie', async () => {
  const res = await fetch(`${base}/me`, {
    headers: { cookie: 'uid=not-signed' },
  })
  const body = await res.json()
  expect(body.uid).toBeNull()
})

test('cookies: missing cookie returns null from @SignedCookie', async () => {
  const res = await fetch(`${base}/me`)
  const body = await res.json()
  expect(body.uid).toBeNull()
})
