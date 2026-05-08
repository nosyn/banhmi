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

function extractCookie(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? ''
}

test('session: first GET / returns count=1 and sets a cookie', async () => {
  const res = await fetch(`${base}/`)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.count).toBe(1)
  expect(res.headers.get('set-cookie')).toContain('banhmi.sid=')
})

test('session: counter increments across requests', async () => {
  const r1 = await fetch(`${base}/`)
  const cookie = extractCookie(r1.headers.get('set-cookie') ?? '')

  const r2 = await fetch(`${base}/`, { headers: { cookie } })
  const b2 = await r2.json()
  expect(b2.count).toBe(2)

  const r3 = await fetch(`${base}/`, { headers: { cookie } })
  const b3 = await r3.json()
  expect(b3.count).toBe(3)
})

test('session: different client gets independent counter', async () => {
  // Client A
  const rA1 = await fetch(`${base}/`)
  const cookieA = extractCookie(rA1.headers.get('set-cookie') ?? '')
  await fetch(`${base}/`, { headers: { cookie: cookieA } })
  const rA3 = await fetch(`${base}/`, { headers: { cookie: cookieA } })
  const bA3 = await rA3.json()
  expect(bA3.count).toBe(3)

  // Client B starts fresh
  const rB1 = await fetch(`${base}/`)
  const bB1 = await rB1.json()
  expect(bB1.count).toBe(1)
})
