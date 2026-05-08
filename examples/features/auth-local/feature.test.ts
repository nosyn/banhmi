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

test('auth-local: POST /login with valid credentials returns 200', async () => {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'secret123' }),
  })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.user.email).toBe('alice@example.com')
  expect(body.message).toBe('Login successful')
})

test('auth-local: POST /login with wrong password returns 401', async () => {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'wrong' }),
  })
  expect(res.status).toBe(401)
  const body = await res.json()
  expect(body.message).toBe('Unauthorized')
})

test('auth-local: POST /login with unknown user returns 401', async () => {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'nobody', password: 'anything' }),
  })
  expect(res.status).toBe(401)
})

test('auth-local: GET /me without credentials returns 401', async () => {
  // GET /me is also guarded by @UseAuth('local') — no JSON body means no creds
  const res = await fetch(`${base}/me`, {
    headers: { 'content-type': 'application/json' },
    // no body
  })
  // No credentials => 401
  expect(res.status).toBe(401)
})
