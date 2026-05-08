/**
 * Integration test for the middleware micro-example.
 * Boots a real server and verifies:
 * 1. The response is `{ ok: true }`.
 * 2. The logger middleware captures the request (shared counter increments).
 */

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { Controller, Get, Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import type { MiddlewareFn } from '@banhmi/middleware'
import { BanhmiFactory } from '@banhmi/platform-bun'

// Re-implement inline so the test is self-contained
let hitCount = 0

const loggerMiddleware: MiddlewareFn = async (_req, _ctx, next) => {
  hitCount++
  return next()
}

@Controller('/api')
class ApiController {
  @Get()
  handle() {
    return { ok: true }
  }
}

@Module({ controllers: [ApiController] })
class AppModule {
  configure(consumer: unknown) {
    ;(
      consumer as {
        apply(...mws: MiddlewareFn[]): { forRoutes(...routes: string[]): void }
      }
    )
      .apply(loggerMiddleware)
      .forRoutes('api')
  }
}

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

test('GET /api returns { ok: true }', async () => {
  const res = await fetch(`${base}/api`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as { ok: boolean }
  expect(body.ok).toBe(true)
})

test('logger middleware increments the counter', async () => {
  hitCount = 0
  await fetch(`${base}/api`)
  expect(hitCount).toBe(1)
})

test('middleware does NOT run for a non-matching path', async () => {
  hitCount = 0
  await fetch(`${base}/unknown-path`)
  expect(hitCount).toBe(0)
})
