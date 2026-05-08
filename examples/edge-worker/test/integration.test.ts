import { describe, expect, test } from 'bun:test'
import { createEdgeHandler } from '@banhmi/edge'
import { AppModule } from '../src/app.module'

describe('edge-worker integration', () => {
  test('GET / returns greeting', async () => {
    const handler = await createEdgeHandler(AppModule)
    const res = await handler(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toContain('Hello')
  })

  test('GET /health returns ok', async () => {
    const handler = await createEdgeHandler(AppModule)
    const res = await handler(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('unknown route returns 404', async () => {
    const handler = await createEdgeHandler(AppModule)
    const res = await handler(new Request('http://localhost/not-found'))
    expect(res.status).toBe(404)
  })

  test('handler returns a Response instance', async () => {
    const handler = await createEdgeHandler(AppModule)
    const res = await handler(new Request('http://localhost/'))
    expect(res).toBeInstanceOf(Response)
  })
})
