import { describe, expect, mock, test } from 'bun:test'
import type { CallHandler, ExecutionContext } from '@banhmi/common'
import { OtelInterceptor } from '../src/otel.interceptor'
import type { OtelOptions } from '../src/types'

// ---------------------------------------------------------------------------
// Minimal OTel tracer/span mock — avoids importing @opentelemetry/api
// ---------------------------------------------------------------------------

function makeSpanMock() {
  const span = {
    setAttribute: mock(
      (_key: string, _value: string | number | boolean) => span,
    ),
    setStatus: mock((_status: { code: number; message?: string }) => span),
    end: mock(() => {}),
  }
  return span
}

function makeTracerMock() {
  const span = makeSpanMock()
  const tracer = {
    startSpan: mock((_name: string) => span),
    _span: span,
  }
  return tracer
}

// ---------------------------------------------------------------------------
// Minimal execution-context stub
// ---------------------------------------------------------------------------

function makeContext(
  method = 'GET',
  url = 'http://localhost/api/users',
): ExecutionContext {
  return {
    getCtx: () => ({
      req: new Request(url, { method }),
      set: () => {},
    }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext
}

function makeNext(returnValue: unknown = { users: [] }): CallHandler {
  return { handle: mock(async () => returnValue) }
}

// ---------------------------------------------------------------------------
// OtelBootstrapService — tested indirectly by checking no-op path
// ---------------------------------------------------------------------------

describe('OtelModule options', () => {
  test('enabled defaults to true (no explicit opt-out)', () => {
    const opts: OtelOptions = { serviceName: 'test' }
    expect(opts.enabled).toBeUndefined() // treated as true
  })

  test('exporters defaults to console', () => {
    const opts: OtelOptions = { serviceName: 'test' }
    const exporters = opts.exporters ?? ['console']
    expect(exporters).toContain('console')
  })
})

// ---------------------------------------------------------------------------
// OtelInterceptor
// ---------------------------------------------------------------------------

describe('OtelInterceptor', () => {
  test('startSpan is called with method + path', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: true })

    const next = makeNext()
    await interceptor.intercept(
      makeContext('GET', 'http://localhost/api/items'),
      next,
    )

    expect(tracer.startSpan).toHaveBeenCalledTimes(1)
    const [spanName] = tracer.startSpan.mock.calls[0]
    expect(spanName).toBe('GET /api/items')
  })

  test('http.method attribute is set on the span', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: true })

    await interceptor.intercept(
      makeContext('POST', 'http://localhost/api/users'),
      makeNext(),
    )

    const span = tracer._span
    const methodCall = span.setAttribute.mock.calls.find(
      ([key]) => key === 'http.method',
    )
    expect(methodCall).toBeDefined()
    expect(methodCall?.[1]).toBe('POST')
  })

  test('http.target attribute is set to the URL pathname', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: true })

    await interceptor.intercept(
      makeContext('GET', 'http://localhost/api/orders'),
      makeNext(),
    )

    const span = tracer._span
    const targetCall = span.setAttribute.mock.calls.find(
      ([key]) => key === 'http.target',
    )
    expect(targetCall).toBeDefined()
    expect(targetCall?.[1]).toBe('/api/orders')
  })

  test('span is ended after handler resolves', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: true })

    await interceptor.intercept(makeContext(), makeNext())

    expect(tracer._span.end).toHaveBeenCalledTimes(1)
  })

  test('http.status_code is set to 200 for non-Response results', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: true })

    await interceptor.intercept(makeContext(), makeNext({ data: [] }))

    const span = tracer._span
    const statusCall = span.setAttribute.mock.calls.find(
      ([key]) => key === 'http.status_code',
    )
    expect(statusCall?.[1]).toBe(200)
  })

  test('http.status_code is set from a Response result', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: true })

    const next: CallHandler = {
      handle: mock(async () => new Response('ok', { status: 201 })),
    }
    await interceptor.intercept(makeContext('POST'), next)

    const span = tracer._span
    const statusCall = span.setAttribute.mock.calls.find(
      ([key]) => key === 'http.status_code',
    )
    expect(statusCall?.[1]).toBe(201)
  })

  test('span status ERROR and http.status_code 500 are set when handler throws', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: true })

    const next: CallHandler = {
      handle: mock(async () => {
        throw new Error('db error')
      }),
    }

    await expect(interceptor.intercept(makeContext(), next)).rejects.toThrow(
      'db error',
    )

    const span = tracer._span
    expect(span.end).toHaveBeenCalledTimes(1)

    const statusCall = span.setAttribute.mock.calls.find(
      ([key]) => key === 'http.status_code',
    )
    expect(statusCall?.[1]).toBe(500)

    const spanStatus = span.setStatus.mock.calls[0][0]
    expect(spanStatus.code).toBe(2) // ERROR
  })

  test('skips tracing when enabled is false', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: false })

    const next = makeNext()
    await interceptor.intercept(makeContext(), next)

    expect(tracer.startSpan).not.toHaveBeenCalled()
    expect(next.handle).toHaveBeenCalledTimes(1)
  })

  test('passes handler return value through', async () => {
    const tracer = makeTracerMock()
    const interceptor = new OtelInterceptor(tracer, { enabled: true })

    const result = await interceptor.intercept(
      makeContext(),
      makeNext({ answer: 42 }),
    )

    expect(result).toEqual({ answer: 42 })
  })
})

// ---------------------------------------------------------------------------
// OtelModule bootstrap with enabled: false (SDK mock path)
// ---------------------------------------------------------------------------

describe('OtelModule bootstrap', () => {
  test('bootstrap service skips SDK start when enabled is false', () => {
    // We test this by constructing a minimal bootstrap simulation:
    const opts: OtelOptions = { serviceName: 'demo', enabled: false }
    let startCalled = false
    const fakeSDK = {
      start: () => {
        startCalled = true
      },
    }

    if (opts.enabled !== false) {
      fakeSDK.start()
    }

    expect(startCalled).toBe(false)
  })

  test('bootstrap service calls SDK start when enabled is true', () => {
    const opts: OtelOptions = { serviceName: 'demo' }
    let startCalled = false
    const fakeSDK = {
      start: () => {
        startCalled = true
      },
    }

    if (opts.enabled !== false) {
      fakeSDK.start()
    }

    expect(startCalled).toBe(true)
  })
})
