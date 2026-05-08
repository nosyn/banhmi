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
    .setTitle('Items API')
    .setVersion('1.0.0')
    .build()
  SwaggerModule.setup('/api', app, doc, { ui: 'swagger' })
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

test('openapi-swagger-ui: GET /api/openapi.json returns spec with correct title', async () => {
  const res = await fetch(`${base}/api/openapi.json`)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect((body as { info: { title: string } }).info.title).toBe('Items API')
})

test('openapi-swagger-ui: GET /api/openapi.json contains /items path', async () => {
  const res = await fetch(`${base}/api/openapi.json`)
  const body = await res.json()
  expect(
    (body as { paths: Record<string, unknown> }).paths['/items'],
  ).toBeDefined()
})

test('openapi-swagger-ui: GET /api returns Swagger UI HTML', async () => {
  const res = await fetch(`${base}/api`)
  expect(res.status).toBe(200)
  const html = await res.text()
  expect(html).toContain('swagger-ui-bundle.js')
})

test('openapi-swagger-ui: Swagger HTML references openapi.json spec URL', async () => {
  const res = await fetch(`${base}/api`)
  const html = await res.text()
  expect(html).toContain('/api/openapi.json')
})

test('openapi-swagger-ui: GET /items returns item list', async () => {
  const res = await fetch(`${base}/items`)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
})
