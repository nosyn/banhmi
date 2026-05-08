import type { CallHandler, ExecutionContext, Interceptor } from '@banhmi/common'

/**
 * Minimal interface for an OTel span — avoids importing `@opentelemetry/api`
 * at the module level (peer dep).
 *
 * @internal
 */
interface OtelSpan {
  setAttribute(key: string, value: string | number | boolean): this
  setStatus(status: { code: number; message?: string }): this
  end(): void
}

/**
 * Minimal interface for an OTel tracer — avoids importing `@opentelemetry/api`
 * at the module level (peer dep).
 *
 * @internal
 */
interface OtelTracer {
  startSpan(name: string, options?: unknown): OtelSpan
}

/**
 * Interceptor that wraps each request handler in an OpenTelemetry span.
 *
 * The span carries the standard semantic-convention HTTP attributes:
 * - `http.method` — e.g. `GET`
 * - `http.target` — the URL pathname
 * - `http.status_code` — set after the handler resolves
 *
 * When the handler throws the span is ended with `SpanStatusCode.ERROR`.
 *
 * @example
 * // Inject via DI:
 * class AppModule {
 *   // The OtelModule registers the interceptor automatically.
 * }
 *
 * // Manual usage:
 * const interceptor = new OtelInterceptor(tracer, opts)
 */
export class OtelInterceptor implements Interceptor {
  /**
   * @param tracer - OTel tracer (from `OTEL_TRACER` token or direct).
   * @param opts - OTel options (only `enabled` is read here).
   */
  constructor(
    private readonly tracer: OtelTracer,
    private readonly opts: { enabled?: boolean },
  ) {}

  /**
   * Intercept the request. When enabled, starts a span, records HTTP
   * attributes, and ends the span after the handler completes.
   *
   * @param context - Banhmi execution context.
   * @param next - The downstream handler.
   * @returns The handler result.
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<unknown> {
    if (this.opts.enabled === false) {
      return next.handle()
    }

    const ctx = context.getCtx()
    const req = ctx.req
    const url = new URL(req.url)
    const method = req.method
    const target = url.pathname

    const span = this.tracer.startSpan(`${method} ${target}`)
    span.setAttribute('http.method', method)
    span.setAttribute('http.target', target)

    try {
      const result = await next.handle()
      // Attempt to read status code from the result if it is a Response
      if (result instanceof Response) {
        span.setAttribute('http.status_code', result.status)
        if (result.status >= 500) {
          span.setStatus({ code: 2, message: 'Server error' }) // ERROR code
        } else {
          span.setStatus({ code: 1 }) // OK code
        }
      } else {
        span.setAttribute('http.status_code', 200)
        span.setStatus({ code: 1 })
      }
      return result
    } catch (err) {
      span.setAttribute('http.status_code', 500)
      span.setStatus({
        code: 2,
        message: err instanceof Error ? err.message : String(err),
      })
      throw err
    } finally {
      span.end()
    }
  }
}
