import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { ALLOWED_ORIGIN, AppModule } from './index'

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

test('cors example: allowed origin gets ACAO header', async () => {
  const res = await fetch(`${base}/`, {
    headers: { origin: ALLOWED_ORIGIN },
  })
  expect(res.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN)
})

test('cors example: credentials header set when enabled', async () => {
  const res = await fetch(`${base}/`, {
    headers: { origin: ALLOWED_ORIGIN },
  })
  expect(res.headers.get('access-control-allow-credentials')).toBe('true')
})

test('cors example: rejected origin has no ACAO header', async () => {
  const res = await fetch(`${base}/`, {
    headers: { origin: 'https://evil.com' },
  })
  expect(res.headers.get('access-control-allow-origin')).toBeNull()
})

test('cors example: preflight OPTIONS returns 204', async () => {
  const res = await fetch(`${base}/`, {
    method: 'OPTIONS',
    headers: {
      origin: ALLOWED_ORIGIN,
      'access-control-request-method': 'POST',
    },
  })
  expect(res.status).toBe(204)
  expect(res.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN)
})
