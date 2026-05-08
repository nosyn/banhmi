import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { Controller, Get } from 'banhmi'
import { CompressionModule, negotiateEncoding } from '../src'

// ─── Pure-fn negotiation unit tests ──────────────────────────────────────────

describe('negotiateEncoding (pure fn)', () => {
  test('returns preferred encoding when client accepts it', () => {
    expect(negotiateEncoding('gzip, deflate', ['gzip'])).toBe('gzip')
  })

  test('respects server preference order', () => {
    expect(negotiateEncoding('gzip, deflate', ['deflate', 'gzip'])).toBe(
      'deflate',
    )
  })

  test('returns null when no overlap', () => {
    expect(negotiateEncoding('br', ['gzip', 'deflate'])).toBeNull()
  })

  test('handles wildcard accept-encoding', () => {
    expect(negotiateEncoding('*', ['gzip'])).toBe('gzip')
  })

  test('respects q=0 exclusion', () => {
    expect(negotiateEncoding('gzip;q=0', ['gzip'])).toBeNull()
  })

  test('returns null for empty accept-encoding', () => {
    expect(negotiateEncoding('', ['gzip'])).toBeNull()
  })
})

// ─── Integration fixture ─────────────────────────────────────────────────────

// A 2 KB JSON payload (above default 1024 threshold)
const BIG_PAYLOAD = { data: 'x'.repeat(2048) }
const SMALL_PAYLOAD = { data: 'hi' }

@Controller()
class DataController {
  @Get('/big')
  getBig() {
    return BIG_PAYLOAD
  }

  @Get('/small')
  getSmall() {
    return SMALL_PAYLOAD
  }

  @Get('/already-encoded')
  getAlreadyEncoded() {
    return new Response(JSON.stringify(BIG_PAYLOAD), {
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'identity',
      },
    })
  }

  @Get('/image')
  getImage() {
    return new Response('PNGDATA'.repeat(300), {
      headers: { 'content-type': 'image/png' },
    })
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({
    imports: [CompressionModule.forRoot({ threshold: 1024 })],
    controllers: [DataController],
  })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

// ─── Integration tests ────────────────────────────────────────────────────────

test('compresses a large JSON body when client accepts gzip', async () => {
  const res = await fetch(`${base}/big`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.status).toBe(200)
  // Bun's fetch auto-decompresses, so content-encoding is still reported in headers
  expect(res.headers.get('content-encoding')).toBe('gzip')

  // fetch auto-decompresses; verify the body round-trips correctly
  const parsed = await res.json()
  expect(parsed.data).toEqual(BIG_PAYLOAD.data)
})

test('skips compression for body under threshold', async () => {
  const res = await fetch(`${base}/small`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.status).toBe(200)
  expect(res.headers.get('content-encoding')).toBeNull()
})

test('skips compression when client does not accept any supported encoding', async () => {
  const res = await fetch(`${base}/big`, {
    headers: { 'accept-encoding': 'br' },
  })
  expect(res.status).toBe(200)
  expect(res.headers.get('content-encoding')).toBeNull()
})

test('sets vary: accept-encoding header', async () => {
  const res = await fetch(`${base}/big`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.headers.get('vary')).toContain('accept-encoding')
})

test('also sets vary when not compressing (below threshold)', async () => {
  const res = await fetch(`${base}/small`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.headers.get('vary')).toContain('accept-encoding')
})

test('does not double-compress when content-encoding already set', async () => {
  const res = await fetch(`${base}/already-encoded`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.status).toBe(200)
  // Should keep the original 'identity' encoding, not replace with 'gzip'
  expect(res.headers.get('content-encoding')).toBe('identity')
})

test('skips compression for non-compressible content types', async () => {
  const res = await fetch(`${base}/image`, {
    headers: { 'accept-encoding': 'gzip' },
  })
  expect(res.status).toBe(200)
  expect(res.headers.get('content-encoding')).toBeNull()
})

test('compresses with deflate when requested', async () => {
  @Module({
    imports: [
      CompressionModule.forRoot({ threshold: 100, encodings: ['deflate'] }),
    ],
    controllers: [DataController],
  })
  class DeflateAppModule {}

  const deflateApp = await BanhmiFactory.create(DeflateAppModule)
  await deflateApp.listen(0)
  const deflateBase = deflateApp.getUrl()

  try {
    const res = await fetch(`${deflateBase}/big`, {
      headers: { 'accept-encoding': 'deflate' },
    })
    expect(res.headers.get('content-encoding')).toBe('deflate')
  } finally {
    await deflateApp.close()
  }
})
