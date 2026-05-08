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

test('logger: GET /hello returns a greeting', async () => {
  const res = await fetch(`${base}/hello`)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.message).toContain('Hello from')
})
