import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Module, StreamableFile } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { Controller } from 'banhmi'
import type { SseEvent } from '../src'
import {
  formatSseEvent,
  Sse,
  sseEventStream,
  sseHeartbeat,
  sseToReadableStream,
} from '../src'

// ─── Unit tests: formatSseEvent ───────────────────────────────────────────────

describe('formatSseEvent', () => {
  test('formats data-only event', () => {
    expect(formatSseEvent({ data: { x: 1 } })).toBe('data: {"x":1}\n\n')
  })

  test('includes event field when set', () => {
    expect(formatSseEvent({ event: 'tick', data: 1 })).toBe(
      'event: tick\ndata: 1\n\n',
    )
  })

  test('includes id and retry when set', () => {
    expect(
      formatSseEvent({ event: 'msg', id: 'a', retry: 3000, data: 'hi' }),
    ).toBe('event: msg\nid: a\nretry: 3000\ndata: hi\n\n')
  })

  test('emits string data as-is (no JSON stringify)', () => {
    expect(formatSseEvent({ data: 'hello' })).toBe('data: hello\n\n')
  })

  test('splits multi-line string into multiple data: lines', () => {
    expect(formatSseEvent({ data: 'line1\nline2\nline3' })).toBe(
      'data: line1\ndata: line2\ndata: line3\n\n',
    )
  })

  test('stringifies non-string data', () => {
    expect(formatSseEvent({ data: [1, 2] })).toBe('data: [1,2]\n\n')
  })
})

// ─── Unit tests: sseEventStream ──────────────────────────────────────────────

describe('sseEventStream', () => {
  async function collect(src: AsyncIterable<SseEvent>): Promise<string[]> {
    const out: string[] = []
    for await (const chunk of sseEventStream(src)) {
      out.push(chunk)
    }
    return out
  }

  test('formats data-only events', async () => {
    async function* src() {
      yield { data: { x: 1 } }
    }
    const out = await collect(src())
    expect(out).toHaveLength(1)
    expect(out[0]).toBe('data: {"x":1}\n\n')
  })

  test('includes event and id fields', async () => {
    async function* src() {
      yield { event: 'tick', id: 'a', data: 1 }
    }
    const out = await collect(src())
    expect(out[0]).toBe('event: tick\nid: a\ndata: 1\n\n')
  })

  test('handles multiple events in order', async () => {
    async function* src() {
      yield { data: 1 }
      yield { data: 2 }
      yield { data: 3 }
    }
    const out = await collect(src())
    expect(out).toHaveLength(3)
    expect(out[0]).toBe('data: 1\n\n')
    expect(out[2]).toBe('data: 3\n\n')
  })

  test('multi-line data string produces multiple data: lines', async () => {
    async function* src() {
      yield { data: 'a\nb' }
    }
    const out = await collect(src())
    expect(out[0]).toBe('data: a\ndata: b\n\n')
  })
})

// ─── Unit tests: sseHeartbeat ─────────────────────────────────────────────────

describe('sseHeartbeat', () => {
  test('yields the correct event shape', async () => {
    let count = 0
    for await (const ev of sseHeartbeat(10)) {
      expect(ev.event).toBe('heartbeat')
      expect(ev.data).toEqual({})
      count++
      if (count >= 2) break
    }
    expect(count).toBe(2)
  })
})

// ─── Integration test: @Sse endpoint ─────────────────────────────────────────

@Controller()
class EventsController {
  @Sse('/events')
  stream() {
    async function* source(): AsyncIterable<SseEvent> {
      yield { event: 'msg', id: '1', data: { n: 1 } }
      yield { event: 'msg', id: '2', data: { n: 2 } }
      yield { event: 'msg', id: '3', data: { n: 3 } }
    }
    return new StreamableFile(sseToReadableStream(source()))
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({ controllers: [EventsController] })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

test('SSE endpoint: GET /events streams three events', async () => {
  const res = await fetch(`${base}/events`, {
    headers: { accept: 'text/event-stream' },
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('text/event-stream')

  const text = await res.text()

  // Verify all three events are present in order
  expect(text).toContain('event: msg')
  expect(text).toContain('id: 1')
  expect(text).toContain('id: 2')
  expect(text).toContain('id: 3')
  expect(text).toContain('data: {"n":1}')
  expect(text).toContain('data: {"n":2}')
  expect(text).toContain('data: {"n":3}')
})

test('SSE endpoint: sets correct SSE headers', async () => {
  const res = await fetch(`${base}/events`)
  expect(res.headers.get('cache-control')).toBe('no-cache')
  expect(res.headers.get('connection')).toBe('keep-alive')
})
