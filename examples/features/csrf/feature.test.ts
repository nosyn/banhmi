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

function extractCsrfCookie(setCookie: string | null): string | null {
  if (!setCookie) return null
  const match = setCookie.match(/csrf-token=([^;]+)/)
  return match ? decodeURIComponent(match[1] ?? '') : null
}

test('csrf example: GET issues csrf-token cookie', async () => {
  const res = await fetch(`${base}/`)
  const setCookie = res.headers.get('set-cookie')
  expect(setCookie).toContain('csrf-token=')
})

test('csrf example: round-trip — GET then POST with token succeeds', async () => {
  // Step 1: get the CSRF token
  const getRes = await fetch(`${base}/`)
  const setCookie = getRes.headers.get('set-cookie') ?? ''
  const token = extractCsrfCookie(setCookie) ?? ''
  expect(token).toBeTruthy()

  // Step 2: POST with both cookie and header
  const postRes = await fetch(`${base}/form`, {
    method: 'POST',
    headers: {
      cookie: `csrf-token=${encodeURIComponent(token)}`,
      'x-csrf-token': token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  expect(postRes.status).toBe(200)
  const body = await postRes.json()
  expect(body.accepted).toBe(true)
})

test('csrf example: POST without token returns 403', async () => {
  const getRes = await fetch(`${base}/`)
  const setCookie = getRes.headers.get('set-cookie') ?? ''
  const token = extractCsrfCookie(setCookie) ?? ''

  const res = await fetch(`${base}/form`, {
    method: 'POST',
    headers: {
      cookie: `csrf-token=${encodeURIComponent(token)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  expect(res.status).toBe(403)
})
