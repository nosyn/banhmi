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

test('serialization: /profile excludes password field', async () => {
  const res = await fetch(`${base}/profile`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as Record<string, unknown>
  expect(body).not.toHaveProperty('password')
  expect(body.name).toBe('mochi')
})

test('serialization: /profile renames id to user_id', async () => {
  const res = await fetch(`${base}/profile`)
  const body = (await res.json()) as Record<string, unknown>
  expect(body).toHaveProperty('user_id', 1)
  expect(body).not.toHaveProperty('id')
})

test('serialization: /profile does not expose email without admin group', async () => {
  const res = await fetch(`${base}/profile`)
  const body = (await res.json()) as Record<string, unknown>
  expect(body).not.toHaveProperty('email')
})

test('serialization: /admin/profile exposes email with admin group', async () => {
  const res = await fetch(`${base}/admin/profile`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as Record<string, unknown>
  expect(body.email).toBe('mochi@example.com')
  expect(body).not.toHaveProperty('password')
})
