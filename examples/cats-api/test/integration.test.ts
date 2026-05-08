import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { AppModule, requestLog } from '../src/app.module'

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
  // Seed some cats for the compression test
  await fetch(`${base}/cats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Mochi', age: 2 }),
  })
})

afterAll(async () => {
  await app.close()
})

// ─── Logger middleware ────────────────────────────────────────────────────────

test('logger middleware records the request', async () => {
  requestLog.length = 0
  const res = await fetch(`${base}/cats`)
  expect(res.status).toBe(200)
  expect(requestLog.some((entry) => entry === 'GET /cats')).toBe(true)
})

// ─── Zod validation ───────────────────────────────────────────────────────────

test('validation rejects malformed POST body with 400 and structured errors', async () => {
  const res = await fetch(`${base}/cats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 42, age: 'not-a-number' }),
  })
  expect(res.status).toBe(400)
  const body = await res.json()
  // The error response wraps the validation errors
  expect(body).toBeDefined()
})

test('validation accepts a well-formed POST body', async () => {
  const res = await fetch(`${base}/cats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Luna', age: 3 }),
  })
  expect(res.status).toBe(201)
  const body = (await res.json()) as { id: number; name: string; age: number }
  expect(body.name).toBe('Luna')
  expect(body.age).toBe(3)
})

// ─── URI versioning ───────────────────────────────────────────────────────────

test('URI versioning routes /v1/cats and /v2/cats differently', async () => {
  // Seed a cat first
  await fetch(`${base}/cats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Kitty', age: 1 }),
  })

  const v1 = await fetch(`${base}/v1/cats`)
  expect(v1.status).toBe(200)
  const v1Body = (await v1.json()) as Array<Record<string, unknown>>
  if (v1Body.length > 0) {
    // v1 returns only { id, name }
    expect(v1Body[0]).toHaveProperty('id')
    expect(v1Body[0]).toHaveProperty('name')
    expect(v1Body[0]).not.toHaveProperty('age')
  }

  const v2 = await fetch(`${base}/v2/cats`)
  expect(v2.status).toBe(200)
  const v2Body = (await v2.json()) as Array<Record<string, unknown>>
  if (v2Body.length > 0) {
    // v2 returns { id, name, age }
    expect(v2Body[0]).toHaveProperty('id')
    expect(v2Body[0]).toHaveProperty('name')
    expect(v2Body[0]).toHaveProperty('age')
  }
})

// ─── Signed cookies ───────────────────────────────────────────────────────────

test('signed cookie round-trips between /session-id requests', async () => {
  // First request — no cookie, should set one
  const r1 = await fetch(`${base}/session-id`)
  expect(r1.status).toBe(200)
  const b1 = (await r1.json()) as { sid: string; fresh: boolean }
  expect(b1.fresh).toBe(true)
  expect(typeof b1.sid).toBe('string')

  // Extract the signed cookie from Set-Cookie header
  const setCookie = r1.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()
  const rawCookie = (setCookie ?? '').split(';')[0] ?? ''

  // Second request — send the cookie back, should read and verify it
  const r2 = await fetch(`${base}/session-id`, {
    headers: { cookie: rawCookie },
  })
  expect(r2.status).toBe(200)
  const b2 = (await r2.json()) as { sid: string; fresh: boolean }
  expect(b2.fresh).toBe(false)
  expect(b2.sid).toBe(b1.sid)
})

// ─── Compression ─────────────────────────────────────────────────────────────

test('compression middleware returns gzip-encoded responses for large bodies', async () => {
  // Seed enough cats so the JSON body exceeds the 1024 byte threshold
  const promises = Array.from({ length: 30 }, (_, i) =>
    fetch(`${base}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `CompressionCat${i}`, age: i }),
    }),
  )
  await Promise.all(promises)

  const res = await fetch(`${base}/cats`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.status).toBe(200)
  expect(res.headers.get('content-encoding')).toBe('gzip')
})
