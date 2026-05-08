import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule, jwtService } from './index'

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

test('auth-jwt: GET /me with valid Bearer JWT returns 200 with payload', async () => {
  const token = await jwtService.sign({ sub: 'user-42', role: 'editor' })
  const res = await fetch(`${base}/me`, {
    headers: { authorization: `Bearer ${token}` },
  })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.user.sub).toBe('user-42')
  expect(body.user.role).toBe('editor')
})

test('auth-jwt: GET /me without Authorization returns 401', async () => {
  const res = await fetch(`${base}/me`)
  expect(res.status).toBe(401)
})

test('auth-jwt: GET /me with Basic scheme returns 401', async () => {
  const token = await jwtService.sign({ sub: 'x' })
  const res = await fetch(`${base}/me`, {
    headers: { authorization: `Basic ${token}` },
  })
  expect(res.status).toBe(401)
})

test('auth-jwt: GET /me with malformed token returns 401', async () => {
  const res = await fetch(`${base}/me`, {
    headers: { authorization: 'Bearer garbage.token.here' },
  })
  expect(res.status).toBe(401)
})

test('auth-jwt: GET /me with expired token returns 401', async () => {
  const { JwtService } = await import('@banhmi/jwt')
  const shortService = new JwtService({
    secret: 'demo-jwt-secret-min-32-chars!!',
    expiresIn: '1s',
  })
  const token = await shortService.sign({ sub: 'expired-user' })
  await new Promise((r) => setTimeout(r, 1100))
  const res = await fetch(`${base}/me`, {
    headers: { authorization: `Bearer ${token}` },
  })
  expect(res.status).toBe(401)
})
