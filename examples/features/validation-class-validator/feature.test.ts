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

test('validation-class-validator: accepts valid POST body', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice',
      email: 'alice@example.com',
      age: 25,
      role: 'user',
      active: true,
    }),
  })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toMatchObject({ created: true, data: { name: 'Alice' } })
})

test('validation-class-validator: accepts valid body with optional bio', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob',
      email: 'bob@example.com',
      age: 30,
      role: 'admin',
      active: false,
      bio: 'a developer',
    }),
  })
  expect(res.status).toBe(200)
})

test('validation-class-validator: rejects missing required fields with 400', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Alice' }),
  })
  expect(res.status).toBe(400)
})

test('validation-class-validator: rejects invalid email with 400', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice',
      email: 'not-an-email',
      age: 25,
      role: 'user',
      active: true,
    }),
  })
  expect(res.status).toBe(400)
})

test('validation-class-validator: rejects name shorter than MinLength(2) with 400', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'A',
      email: 'alice@example.com',
      age: 25,
      role: 'user',
      active: true,
    }),
  })
  expect(res.status).toBe(400)
})

test('validation-class-validator: rejects negative age with 400', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice',
      email: 'alice@example.com',
      age: -1,
      role: 'user',
      active: true,
    }),
  })
  expect(res.status).toBe(400)
})

test('validation-class-validator: rejects invalid role with 400', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice',
      email: 'alice@example.com',
      age: 25,
      role: 'superuser',
      active: true,
    }),
  })
  expect(res.status).toBe(400)
})
