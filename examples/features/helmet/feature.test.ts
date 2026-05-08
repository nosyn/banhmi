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

test('helmet example: X-Content-Type-Options is nosniff', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('x-content-type-options')).toBe('nosniff')
})

test('helmet example: X-Frame-Options is SAMEORIGIN', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN')
})

test('helmet example: Content-Security-Policy is set', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('content-security-policy')).toBe("default-src 'self'")
})
