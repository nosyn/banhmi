/**
 * Middleware micro-example — a logging middleware that prints `<method> <url>`
 * for every matching request, and a simple controller that responds `{ ok: true }`.
 *
 * Run:  bun run index.ts
 * Test: bun test feature.test.ts
 */

import { Controller, Get, Module } from '@banhmi/common'
import type { MiddlewareFn } from '@banhmi/middleware'
import { BanhmiFactory } from '@banhmi/platform-bun'

// ─── Logging middleware ───────────────────────────────────────────────────────

let requestCount = 0

/** Logs `<METHOD> <url>` to stdout and increments the request counter. */
export const loggerMiddleware: MiddlewareFn = async (req, _ctx, next) => {
  requestCount++
  console.log(`[logger] ${req.method} ${req.url}`)
  return next()
}

/** Returns the number of requests seen by the logger middleware. */
export function getRequestCount(): number {
  return requestCount
}

/** Resets the request counter. */
export function resetRequestCount(): void {
  requestCount = 0
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('/api')
class ApiController {
  @Get()
  handle() {
    return { ok: true }
  }
}

// ─── App module ───────────────────────────────────────────────────────────────

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

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const app = await BanhmiFactory.create(AppModule)
await app.listen(3000)
console.log('Middleware example running on http://localhost:3000')
console.log('  GET /api  →  { ok: true }  (logger prints the request)')
