import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module, Post } from 'banhmi'
import { SecurityModule } from '../src/security.module'

@Controller()
class TestController {
  @Get('/')
  index() {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  @Post('/submit')
  submit() {
    return new Response(JSON.stringify({ submitted: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({
    imports: [
      SecurityModule.forRoot({
        helmet: {},
        cors: { origin: 'https://test.example.com' },
        csrf: {},
      }),
    ],
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

test('SecurityModule: helmet headers are set', async () => {
  const res = await fetch(`${base}/`)
  expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN')
})

test('SecurityModule: cors headers set for allowed origin', async () => {
  const res = await fetch(`${base}/`, {
    headers: { origin: 'https://test.example.com' },
  })
  expect(res.headers.get('access-control-allow-origin')).toBe(
    'https://test.example.com',
  )
})

test('SecurityModule: csrf cookie issued on GET', async () => {
  const res = await fetch(`${base}/`)
  const setCookie = res.headers.get('set-cookie')
  expect(setCookie).toContain('csrf-token=')
})

test('SecurityModule: csrf POST without token returns 403', async () => {
  const getRes = await fetch(`${base}/`)
  const setCookie = getRes.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/csrf-token=([^;]+)/)
  const token = match ? decodeURIComponent(match[1] ?? '') : ''

  const res = await fetch(`${base}/submit`, {
    method: 'POST',
    headers: {
      cookie: `csrf-token=${encodeURIComponent(token)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  expect(res.status).toBe(403)
})

test('SecurityModule: csrf POST with token succeeds', async () => {
  const getRes = await fetch(`${base}/`)
  const setCookie = getRes.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/csrf-token=([^;]+)/)
  const token = match ? decodeURIComponent(match[1] ?? '') : ''

  const res = await fetch(`${base}/submit`, {
    method: 'POST',
    headers: {
      cookie: `csrf-token=${encodeURIComponent(token)}`,
      'x-csrf-token': token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  expect(res.status).toBe(200)
})
