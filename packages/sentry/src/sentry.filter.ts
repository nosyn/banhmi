import type { ExceptionFilter, ExecutionContext } from '@banhmi/common'
import { HttpException } from '@banhmi/common'
import type * as SentryTypes from '@sentry/node'

/**
 * Global exception filter that captures unhandled exceptions in Sentry and
 * then produces the standard HTTP error response.
 *
 * Register it as a global filter alongside {@link SentryModule}. The filter
 * calls `Sentry.captureException(exception)` for every non-HTTP exception and
 * all HTTP exceptions with status >= 500. HTTP 4xx errors are forwarded
 * without being captured (client errors are not bugs).
 *
 * @example
 * // In your app bootstrap:
 * const app = await BanhmiFactory.create(AppModule)
 * // Global filters are registered through the platform adapter — see docs.
 *
 * @example
 * // Minimal standalone usage:
 * const filter = new SentryExceptionFilter(Sentry)
 * const response = filter.catch(new Error('boom'), ctx)
 */
export class SentryExceptionFilter implements ExceptionFilter<unknown> {
  /**
   * @param sentry - The `@sentry/node` module (injected or passed directly).
   */
  constructor(private readonly sentry: typeof SentryTypes) {}

  /**
   * Catch an exception, report it to Sentry if appropriate, and return an
   * HTTP {@link Response}.
   *
   * @param exception - The thrown value.
   * @param _context - Banhmi execution context (unused but required by interface).
   * @returns A JSON {@link Response} with the appropriate HTTP status code.
   */
  catch(exception: unknown, _context: ExecutionContext): Response {
    if (exception instanceof HttpException) {
      if (exception.statusCode >= 500) {
        this.sentry.captureException(exception)
      }
      return Response.json(
        { statusCode: exception.statusCode, message: exception.message },
        { status: exception.statusCode },
      )
    }

    this.sentry.captureException(exception)

    const isProduction = Bun.env.NODE_ENV === 'production'
    const message = isProduction ? 'Internal Server Error' : String(exception)
    return Response.json({ statusCode: 500, message }, { status: 500 })
  }
}
