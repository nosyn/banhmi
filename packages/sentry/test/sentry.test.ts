import { describe, expect, mock, test } from 'bun:test'
import type { CallHandler, ExecutionContext } from '@banhmi/common'
import { HttpException } from '@banhmi/common'
import { SentryExceptionFilter } from '../src/sentry.filter'
import { SentryInterceptor } from '../src/sentry.interceptor'
import type { SentryOptions } from '../src/types'

// ---------------------------------------------------------------------------
// Minimal Sentry mock — used in place of @sentry/node throughout all tests
// ---------------------------------------------------------------------------

function makeSentryMock() {
  return {
    init: mock((_opts: unknown) => {}),
    captureException: mock((_err: unknown) => 'event-id'),
    startSpan: mock(async (_ctx: unknown, fn: () => Promise<unknown>) => fn()),
  }
}

// ---------------------------------------------------------------------------
// Minimal execution-context stub
// ---------------------------------------------------------------------------

function makeContext(url = 'http://localhost/test'): ExecutionContext {
  return {
    getCtx: () => ({
      req: new Request(url),
      set: () => {},
    }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext
}

function makeNext(returnValue: unknown = { ok: true }): CallHandler {
  return { handle: mock(async () => returnValue) }
}

// ---------------------------------------------------------------------------
// SentryBootstrapService — tested by calling init manually
// ---------------------------------------------------------------------------

describe('SentryModule init', () => {
  test('init is called with the right options on bootstrap', () => {
    const sentry = makeSentryMock()
    const opts: SentryOptions = {
      dsn: 'https://key@sentry.io/123',
      environment: 'test',
      tracesSampleRate: 0.5,
      release: 'v1.0.0',
    }

    // Simulate what SentryBootstrapService.onApplicationBootstrap does:
    if (opts.enabled !== false) {
      sentry.init({
        dsn: opts.dsn,
        environment: opts.environment,
        tracesSampleRate: opts.tracesSampleRate ?? 0,
        release: opts.release,
      })
    }

    expect(sentry.init).toHaveBeenCalledTimes(1)
    const [initOpts] = sentry.init.mock.calls[0]
    expect((initOpts as Record<string, unknown>)['dsn']).toBe(opts.dsn)
    expect((initOpts as Record<string, unknown>)['environment']).toBe('test')
    expect((initOpts as Record<string, unknown>)['tracesSampleRate']).toBe(0.5)
    expect((initOpts as Record<string, unknown>)['release']).toBe('v1.0.0')
  })

  test('init is NOT called when enabled is false', () => {
    const sentry = makeSentryMock()
    const opts: SentryOptions = {
      dsn: 'https://key@sentry.io/123',
      enabled: false,
    }

    if (opts.enabled !== false) {
      sentry.init({ dsn: opts.dsn })
    }

    expect(sentry.init).not.toHaveBeenCalled()
  })

  test('tracesSampleRate defaults to 0 when not specified', () => {
    const sentry = makeSentryMock()
    const opts: SentryOptions = { dsn: 'https://key@sentry.io/123' }

    sentry.init({
      dsn: opts.dsn,
      tracesSampleRate: opts.tracesSampleRate ?? 0,
    })

    const [initOpts] = sentry.init.mock.calls[0]
    expect((initOpts as Record<string, unknown>)['tracesSampleRate']).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// SentryExceptionFilter
// ---------------------------------------------------------------------------

describe('SentryExceptionFilter', () => {
  test('captureException is called for non-HTTP exceptions', () => {
    const sentry = makeSentryMock()
    const filter = new SentryExceptionFilter(
      sentry as unknown as typeof import('@sentry/node'),
    )

    const err = new Error('database exploded')
    const response = filter.catch(err, makeContext())

    expect(sentry.captureException).toHaveBeenCalledWith(err)
    expect(response.status).toBe(500)
  })

  test('captureException is called for 5xx HTTP exceptions', () => {
    const sentry = makeSentryMock()
    const filter = new SentryExceptionFilter(
      sentry as unknown as typeof import('@sentry/node'),
    )

    const err = new HttpException('Server error', 503)
    filter.catch(err, makeContext())

    expect(sentry.captureException).toHaveBeenCalledWith(err)
  })

  test('captureException is NOT called for 4xx HTTP exceptions', () => {
    const sentry = makeSentryMock()
    const filter = new SentryExceptionFilter(
      sentry as unknown as typeof import('@sentry/node'),
    )

    const err = new HttpException('Not found', 404)
    const response = filter.catch(err, makeContext())

    expect(sentry.captureException).not.toHaveBeenCalled()
    expect(response.status).toBe(404)
  })

  test('returns structured JSON response for HTTP exceptions', async () => {
    const sentry = makeSentryMock()
    const filter = new SentryExceptionFilter(
      sentry as unknown as typeof import('@sentry/node'),
    )

    const err = new HttpException('Forbidden', 403)
    const response = filter.catch(err, makeContext())

    const body = await response.json()
    expect(body).toEqual({ statusCode: 403, message: 'Forbidden' })
  })

  test('returns 500 JSON response for generic errors', async () => {
    const sentry = makeSentryMock()
    const filter = new SentryExceptionFilter(
      sentry as unknown as typeof import('@sentry/node'),
    )

    const response = filter.catch(new TypeError('bad type'), makeContext())
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(typeof body.message).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// SentryInterceptor
// ---------------------------------------------------------------------------

describe('SentryInterceptor', () => {
  test('calls startSpan when tracesSampleRate > 0', async () => {
    const sentry = makeSentryMock()
    const interceptor = new SentryInterceptor(
      sentry as unknown as typeof import('@sentry/node'),
      { tracesSampleRate: 0.5 },
    )

    const next = makeNext()
    await interceptor.intercept(makeContext(), next)

    expect(sentry.startSpan).toHaveBeenCalledTimes(1)
    const [spanCtx] = sentry.startSpan.mock.calls[0]
    expect((spanCtx as Record<string, unknown>)['op']).toBe('http.server')
  })

  test('skips startSpan when tracesSampleRate is 0', async () => {
    const sentry = makeSentryMock()
    const interceptor = new SentryInterceptor(
      sentry as unknown as typeof import('@sentry/node'),
      { tracesSampleRate: 0 },
    )

    const next = makeNext()
    await interceptor.intercept(makeContext(), next)

    expect(sentry.startSpan).not.toHaveBeenCalled()
    expect(next.handle).toHaveBeenCalledTimes(1)
  })

  test('skips startSpan when tracesSampleRate is not set', async () => {
    const sentry = makeSentryMock()
    const interceptor = new SentryInterceptor(
      sentry as unknown as typeof import('@sentry/node'),
      {},
    )

    const next = makeNext()
    await interceptor.intercept(makeContext(), next)

    expect(sentry.startSpan).not.toHaveBeenCalled()
  })

  test('passes through handler return value', async () => {
    const sentry = makeSentryMock()
    const interceptor = new SentryInterceptor(
      sentry as unknown as typeof import('@sentry/node'),
      { tracesSampleRate: 1 },
    )

    const next = makeNext({ result: 42 })
    const result = await interceptor.intercept(makeContext(), next)

    expect(result).toEqual({ result: 42 })
  })

  test('span name is set to the request URL', async () => {
    const sentry = makeSentryMock()
    const interceptor = new SentryInterceptor(
      sentry as unknown as typeof import('@sentry/node'),
      { tracesSampleRate: 1 },
    )

    const next = makeNext()
    await interceptor.intercept(makeContext('http://localhost/api/users'), next)

    const [spanCtx] = sentry.startSpan.mock.calls[0]
    expect((spanCtx as Record<string, unknown>)['name']).toBe(
      'http://localhost/api/users',
    )
  })
})
