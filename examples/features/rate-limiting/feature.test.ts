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

test('rate-limiting: first 5 requests succeed', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${base}/`)
    expect(res.status).toBe(200)
  }
})

test('rate-limiting: 6th request in the same window returns 429', async () => {
  const res = await fetch(`${base}/`)
  expect(res.status).toBe(429)
  expect(res.headers.get('retry-after')).toBeTruthy()
  expect(res.headers.get('x-ratelimit-limit')).toBe('5')
  expect(res.headers.get('x-ratelimit-remaining')).toBe('0')
})
