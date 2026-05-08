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

test('validation-native: accepts valid POST body', async () => {
  const res = await fetch(`${base}/cats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'mochi', age: 3 }),
  })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toMatchObject({ created: true, data: { name: 'mochi' } })
})

test('validation-native: accepts body with optional field absent', async () => {
  const res = await fetch(`${base}/cats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'whiskers' }),
  })
  expect(res.status).toBe(200)
})

test('validation-native: rejects missing required field with 400', async () => {
  const res = await fetch(`${base}/cats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ age: 2 }),
  })
  expect(res.status).toBe(400)
})

test('validation-native: rejects wrong type with 400', async () => {
  const res = await fetch(`${base}/cats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 123 }),
  })
  expect(res.status).toBe(400)
})
