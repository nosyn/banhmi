import type { ExceptionFilter, Guard, Interceptor } from '@banhmi/common'
import { ForbiddenException } from '@banhmi/common'
import type { MicroserviceMessage, MicroserviceResponse } from '../types'

/**
 * Extract the HTTP-like status code from an unknown error value.
 *
 * Checks for `statusCode` first (used by `HttpException`) then `status`.
 */
function extractStatus(err: unknown): number {
  if (err !== null && typeof err === 'object') {
    if (
      'statusCode' in err &&
      typeof (err as { statusCode: unknown }).statusCode === 'number'
    ) {
      return (err as { statusCode: number }).statusCode
    }
    if (
      'status' in err &&
      typeof (err as { status: unknown }).status === 'number'
    ) {
      return (err as { status: number }).status
    }
  }
  return 500
}

/**
 * A minimal execution context for microservice messages.
 *
 * Guards and interceptors operate against this context instead of an HTTP
 * `RouteCtx`.
 *
 * @example
 * class MyGuard implements MsGuard {
 *   canActivate(ctx: MsExecutionContext) {
 *     return ctx.getMessage().pattern !== 'forbidden'
 *   }
 * }
 */
export interface MsExecutionContext {
  /** The raw inbound message. */
  getMessage(): MicroserviceMessage
  /** The handler class (for metadata lookups). */
  getClass(): new (...args: unknown[]) => unknown
  /** The handler method reference. */
  getHandler(): (...args: unknown[]) => unknown
}

/**
 * Microservice-specific guard interface.
 *
 * @example
 * class AuthGuard implements MsGuard {
 *   canActivate(ctx: MsExecutionContext): boolean {
 *     return ctx.getMessage().data !== null
 *   }
 * }
 */
export interface MsGuard {
  canActivate(context: MsExecutionContext): boolean | Promise<boolean>
}

/**
 * Microservice-specific exception filter interface.
 *
 * @example
 * class ErrorFilter implements MsExceptionFilter {
 *   catch(err: unknown) {
 *     return { error: { message: String(err), status: 500 } }
 *   }
 * }
 */
export interface MsExceptionFilter<T = unknown> {
  catch(
    exception: T,
    context: MsExecutionContext,
  ): MicroserviceResponse | Promise<MicroserviceResponse>
}

/**
 * Run the microservice enhancer pipeline: guards → interceptors → handler →
 * exception filters.
 *
 * This mirrors the HTTP `runEnhancerPipeline` but operates on
 * `MicroserviceResponse` rather than `Response`.
 *
 * @param context - The {@link MsExecutionContext} for this message.
 * @param handler - The bound handler function (returns a `MicroserviceResponse`).
 * @param guards - Array of {@link MsGuard} instances to run.
 * @param interceptors - Array of standard {@link Interceptor} instances.
 * @param filters - Array of `{ filterInstance, type? }` pairs.
 * @returns The final `MicroserviceResponse`.
 *
 * @example
 * const result = await runMsEnhancerPipeline(ctx, () => handler(msg), guards, [], [])
 */
export async function runMsEnhancerPipeline(
  context: MsExecutionContext,
  handler: () => Promise<MicroserviceResponse>,
  guards: MsGuard[],
  interceptors: Interceptor[],
  filters: Array<{
    filterInstance: MsExceptionFilter
    type?: new (...args: unknown[]) => unknown
  }>,
): Promise<MicroserviceResponse> {
  try {
    // Run guards
    for (const guard of guards) {
      const allowed = await guard.canActivate(context)
      if (!allowed) throw new ForbiddenException()
    }

    // Run interceptors wrapping the handler
    // Interceptors use the HTTP CallHandler interface — we adapt it here.
    // The final handler is wrapped so interceptors can call `next.handle()`.
    let currentHandler = handler
    for (let i = interceptors.length - 1; i >= 0; i--) {
      const interceptor = interceptors[i]
      const nextHandler = currentHandler
      currentHandler = async () => {
        // The interceptor receives a CallHandler whose `handle()` returns
        // the inner pipeline result.  We cast to satisfy the HTTP interface.
        const callHandler = {
          handle: nextHandler as () => Promise<unknown>,
        }
        // Cast the interceptor's ExecutionContext param — we pass MsExecutionContext
        // which has a compatible shape for the guard/interceptor use-cases.
        const result = await interceptor.intercept(
          context as unknown as Parameters<typeof interceptor.intercept>[0],
          callHandler,
        )
        return result as MicroserviceResponse
      }
    }

    return await currentHandler()
  } catch (err) {
    for (const { filterInstance, type } of filters) {
      if (!type || err instanceof type) {
        return filterInstance.catch(err, context)
      }
    }
    const message = err instanceof Error ? err.message : String(err)
    const status = extractStatus(err)
    return { error: { message, status } }
  }
}

/**
 * Default exception filter for microservice handlers.
 *
 * Catches any unhandled error and returns a serialised `MicroserviceResponse`
 * with the error details.
 *
 * @example
 * const filter = new DefaultMsExceptionFilter()
 * const result = await filter.catch(new Error('oops'), ctx)
 */
export class DefaultMsExceptionFilter implements MsExceptionFilter {
  catch(
    exception: unknown,
    _context: MsExecutionContext,
  ): MicroserviceResponse {
    const message =
      exception instanceof Error ? exception.message : String(exception)
    const status = extractStatus(exception)
    return { error: { message, status } }
  }
}

// Re-export standard Guard/Interceptor/ExceptionFilter types for convenience
export type { ExceptionFilter, Guard, Interceptor }
