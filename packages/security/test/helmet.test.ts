import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module } from 'banhmi'
import { HelmetMiddleware } from '../src/helmet/helmet.middleware'
import { HelmetModule } from '../src/helmet/helmet.module'

@Controller()
class TestController {
  @Get('/')
  index() {
    return new Response('ok')
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({
    imports: [HelmetModule.forRoot()],
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

test('helmet: sets Content-Security-Policy by default', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('content-security-policy')).toBe("default-src 'self'")
})

test('helmet: sets Strict-Transport-Security by default', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('strict-transport-security')).toBe(
    'max-age=15552000; includeSubDomains',
  )
})

test('helmet: sets X-Content-Type-Options by default', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('x-content-type-options')).toBe('nosniff')
})

test('helmet: sets X-Frame-Options by default', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN')
})

test('helmet: sets Referrer-Policy by default', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('referrer-policy')).toBe('no-referrer')
})

test('helmet: sets X-Download-Options by default', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('x-download-options')).toBe('noopen')
})

test('helmet: sets X-DNS-Prefetch-Control by default', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('x-dns-prefetch-control')).toBe('off')
})

test('helmet: false omits a header', async () => {
  // Build middleware directly for isolation
  const fakeAdapter = {
    use: () => {},
  } as unknown as import('@banhmi/core').HttpAdapter
  const middleware = new HelmetMiddleware(
    { 'X-Frame-Options': false },
    fakeAdapter,
  )
  const mw = middleware.buildMiddleware()
  const req = new Request('http://localhost/')
  const res = await mw(req, async () => new Response('ok'))
  expect(res.headers.has('x-frame-options')).toBe(false)
  // Other headers still present
  expect(res.headers.get('x-content-type-options')).toBe('nosniff')
})

test('helmet: custom value overrides default', async () => {
  const fakeAdapter = {
    use: () => {},
  } as unknown as import('@banhmi/core').HttpAdapter
  const middleware = new HelmetMiddleware(
    { 'X-Frame-Options': 'DENY' },
    fakeAdapter,
  )
  const mw = middleware.buildMiddleware()
  const req = new Request('http://localhost/')
  const res = await mw(req, async () => new Response('ok'))
  expect(res.headers.get('x-frame-options')).toBe('DENY')
})
