import { afterAll, beforeAll, expect, test } from 'bun:test'
import { DocumentBuilder, SwaggerModule } from '@banhmi/openapi'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './index'

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  app = await BanhmiFactory.create(AppModule)
  const doc = new DocumentBuilder()
    .setTitle('Cats API')
    .setVersion('1.0.0')
    .build()
  SwaggerModule.setup('/api', app, doc)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

test('openapi-scalar: GET /api/openapi.json returns spec with correct title', async () => {
  const res = await fetch(`${base}/api/openapi.json`)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect((body as { info: { title: string } }).info.title).toBe('Cats API')
})

test('openapi-scalar: GET /api/openapi.json contains /cats path', async () => {
  const res = await fetch(`${base}/api/openapi.json`)
  const body = await res.json()
  expect(
    (body as { paths: Record<string, unknown> }).paths['/cats'],
  ).toBeDefined()
})

test('openapi-scalar: GET /api returns Scalar UI HTML', async () => {
  const res = await fetch(`${base}/api`)
  expect(res.status).toBe(200)
  const html = await res.text()
  expect(html).toContain('@scalar/api-reference')
})

test('openapi-scalar: Scalar HTML references openapi.json spec URL', async () => {
  const res = await fetch(`${base}/api`)
  const html = await res.text()
  expect(html).toContain('/api/openapi.json')
})

test('openapi-scalar: GET /cats returns cat list', async () => {
  const res = await fetch(`${base}/cats`)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
})
