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

test('sse: GET /clock returns text/event-stream', async () => {
  const res = await fetch(`${base}/clock`)
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('text/event-stream')
})

test('sse: GET /clock delivers 5 tick events', async () => {
  const res = await fetch(`${base}/clock`)
  const text = await res.text()

  // 5 tick events with IDs 1..5
  expect(text).toContain('event: tick')
  expect(text).toContain('id: 1')
  expect(text).toContain('id: 5')
  // Each event has a ts field
  const matches = text.match(/data: /g)
  expect(matches).toHaveLength(5)
})

test('sse: response sets no-cache and keep-alive headers', async () => {
  const res = await fetch(`${base}/clock`)
  // Drain to avoid leak
  await res.text()
  expect(res.headers.get('cache-control')).toBe('no-cache')
  expect(res.headers.get('connection')).toBe('keep-alive')
})
