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

test('compression: GET /data with Accept-Encoding: gzip returns content-encoding: gzip', async () => {
  const res = await fetch(`${base}/data`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.status).toBe(200)
  expect(res.headers.get('content-encoding')).toBe('gzip')

  const body = await res.json()
  expect(body.message).toBe('Compressed by @banhmi/compression')
})

test('compression: sets vary: accept-encoding header', async () => {
  const res = await fetch(`${base}/data`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.headers.get('vary')).toContain('accept-encoding')
})

test('compression: no content-encoding when client explicitly accepts only br', async () => {
  // Bun fetch always adds accept-encoding automatically; use a raw request
  // with a header override that excludes gzip to test no-compression path.
  // Since our module only supports gzip/deflate, a 'br'-only client gets no compression.
  const res = await fetch(`${base}/data`, {
    headers: { 'accept-encoding': 'br' },
  })
  expect(res.status).toBe(200)
  expect(res.headers.get('content-encoding')).toBeNull()
})
