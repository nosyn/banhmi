import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module } from 'banhmi'
import { CorsModule } from '../src/cors/cors.module'
import { buildPreflightHeaders, resolveOrigin } from '../src/cors/handle'

@Controller()
class TestController {
  @Get('/')
  index() {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({
    imports: [CorsModule.forRoot({ origin: 'https://allowed.example.com' })],
    controllers: [TestController],
  })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

// ---- Unit: resolveOrigin ----

test('cors: resolveOrigin - wildcard allows any origin', () => {
  expect(resolveOrigin('https://any.com', {})).toBe('*')
  expect(resolveOrigin('https://any.com', { origin: '*' })).toBe('*')
})

test('cors: resolveOrigin - string matches exact origin', () => {
  expect(resolveOrigin('https://a.com', { origin: 'https://a.com' })).toBe(
    'https://a.com',
  )
  expect(resolveOrigin('https://b.com', { origin: 'https://a.com' })).toBeNull()
})

test('cors: resolveOrigin - array allows listed origins', () => {
  const opts = { origin: ['https://a.com', 'https://b.com'] }
  expect(resolveOrigin('https://a.com', opts)).toBe('https://a.com')
  expect(resolveOrigin('https://c.com', opts)).toBeNull()
})

test('cors: resolveOrigin - RegExp matches', () => {
  const opts = { origin: /\.example\.com$/ }
  expect(resolveOrigin('https://app.example.com', opts)).toBe(
    'https://app.example.com',
  )
  expect(resolveOrigin('https://evil.com', opts)).toBeNull()
})

test('cors: resolveOrigin - function predicate', () => {
  const opts = { origin: (o: string) => o.startsWith('https://safe') }
  expect(resolveOrigin('https://safe.com', opts)).toBe('https://safe.com')
  expect(resolveOrigin('https://other.com', opts)).toBeNull()
})

// ---- Integration ----

test('cors: simple GET with allowed origin sets ACAO', async () => {
  const res = await fetch(`${base}/`, {
    headers: { origin: 'https://allowed.example.com' },
  })
  expect(res.status).toBe(200)
  expect(res.headers.get('access-control-allow-origin')).toBe(
    'https://allowed.example.com',
  )
})

test('cors: simple GET with rejected origin has no ACAO', async () => {
  const res = await fetch(`${base}/`, {
    headers: { origin: 'https://evil.com' },
  })
  expect(res.status).toBe(200)
  expect(res.headers.get('access-control-allow-origin')).toBeNull()
})

test('cors: preflight OPTIONS returns 204 with allow headers', async () => {
  const res = await fetch(`${base}/`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://allowed.example.com',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  })
  expect(res.status).toBe(204)
  expect(res.headers.get('access-control-allow-origin')).toBe(
    'https://allowed.example.com',
  )
  expect(res.headers.get('access-control-allow-methods')).toBeTruthy()
})

test('cors: preflight with rejected origin returns 204 without ACAO', async () => {
  const res = await fetch(`${base}/`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://evil.com',
      'access-control-request-method': 'POST',
    },
  })
  expect(res.status).toBe(204)
  expect(res.headers.get('access-control-allow-origin')).toBeNull()
})

// ---- Unit: buildPreflightHeaders mirrors request headers when unset ----
test('cors: buildPreflightHeaders mirrors Access-Control-Request-Headers', () => {
  const req = new Request('http://localhost/', {
    method: 'OPTIONS',
    headers: {
      origin: 'https://a.com',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'x-custom, content-type',
    },
  })
  const headers = buildPreflightHeaders(req, { origin: 'https://a.com' })
  expect(headers?.['Access-Control-Allow-Headers']).toContain('x-custom')
})
