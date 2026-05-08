import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './index'

const PORT = 54410
const BASE = `http://localhost:${PORT}`

let app: BanhmiApplication

beforeAll(async () => {
  app = await BanhmiFactory.create(AppModule)
  await app.listen(PORT)
})

afterAll(async () => {
  await app.close()
})

test('template: GET / returns ok', async () => {
  const res = await fetch(`${BASE}/`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as { ok: boolean }
  expect(body.ok).toBe(true)
})
