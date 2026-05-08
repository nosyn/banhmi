import type { CallHandler, ExecutionContext, Interceptor } from '@banhmi/common'
import type * as SentryTypes from '@sentry/node'

/**
 * Interceptor that wraps each request handler in a Sentry performance span.
 *
 * When `tracesSampleRate > 0` in the Sentry options the interceptor calls
 * `Sentry.startSpan({ op: 'http.server', name: req.url }, ...)`. When tracing
 * is disabled (`tracesSampleRate === 0`) the interceptor passes through
 * without creating a span.
 *
 * @example
 * // In your app bootstrap:
 * const interceptor = new SentryInterceptor(Sentry, { tracesSampleRate: 0.1 })
 */
export class SentryInterceptor implements Interceptor {
  /**
   * @param sentry - The `@sentry/node` module.
   * @param opts - Partial Sentry options (only `tracesSampleRate` is read).
   */
  constructor(
    private readonly sentry: typeof SentryTypes,
    private readonly opts: { tracesSampleRate?: number },
  ) {}

  /**
   * Intercept the request. When tracing is enabled, wraps the handler in a
   * Sentry span; otherwise calls `next.handle()` directly.
   *
   * @param context - Banhmi execution context.
   * @param next - The downstream handler.
   * @returns The handler result.
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<unknown> {
    const tracingEnabled = (this.opts.tracesSampleRate ?? 0) > 0
    if (!tracingEnabled) {
      return next.handle()
    }

    const ctx = context.getCtx()
    const url = ctx.req.url

    return this.sentry.startSpan({ op: 'http.server', name: url }, () =>
      next.handle(),
    )
  }
}
