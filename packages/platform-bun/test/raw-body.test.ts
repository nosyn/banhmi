import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Controller, Injectable, Module, Post } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '../src/factory'
import type { BunRouteCtx } from '../src/route-ctx'

// ─── Setup ───────────────────────────────────────────────────────────────────

@Injectable()
class EchoService {
  echo(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('utf8')
  }
}

@Controller('/echo')
class EchoController {
  static inject = [EchoService] as const

  constructor(private svc: EchoService) {}

  @Post('/')
  async handle(
    ctx: BunRouteCtx,
  ): Promise<{ raw: string; hasRawBody: boolean }> {
    return {
      raw: ctx.rawBody ? this.svc.echo(ctx.rawBody) : '',
      hasRawBody: ctx.rawBody !== undefined,
    }
  }
}

@Module({
  controllers: [EchoController],
  providers: [EchoService],
})
class EchoModule {}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('rawBody option', () => {
  describe('rawBody: true', () => {
    let app: BanhmiApplication
    let base: string

    beforeAll(async () => {
      app = await BanhmiFactory.create(EchoModule, { rawBody: true })
      await app.listen(0)
      base = app.getUrl()
    })

    afterAll(async () => {
      await app.close()
    })

    test('populates ctx.rawBody with request bytes', async () => {
      const payload = 'hello raw body'
      const res = await fetch(`${base}/echo/`, {
        method: 'POST',
        body: payload,
        headers: { 'content-type': 'text/plain' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.hasRawBody).toBe(true)
      expect(body.raw).toBe(payload)
    })

    test('populates ctx.rawBody with binary bytes', async () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03, 0xff])
      const res = await fetch(`${base}/echo/`, {
        method: 'POST',
        body: bytes,
        headers: { 'content-type': 'application/octet-stream' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.hasRawBody).toBe(true)
      // raw is decoded as utf8 (lossy for binary), but length matches
      expect(body.raw.length).toBeGreaterThan(0)
    })
  })

  describe('rawBody: false (default)', () => {
    let app: BanhmiApplication
    let base: string

    beforeAll(async () => {
      app = await BanhmiFactory.create(EchoModule)
      await app.listen(0)
      base = app.getUrl()
    })

    afterAll(async () => {
      await app.close()
    })

    test('ctx.rawBody is undefined when rawBody option not set', async () => {
      const res = await fetch(`${base}/echo/`, {
        method: 'POST',
        body: 'hello',
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.hasRawBody).toBe(false)
    })
  })
})
