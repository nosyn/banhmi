import type {
  CallHandler,
  ExceptionFilter,
  ExecutionContext,
  Guard,
  Interceptor,
  RouteCtx,
} from '@banhmi/common'
import { ForbiddenException, StreamableFile } from '@banhmi/common'
import { GlobalExceptionFilter } from './global-filter'

/**
 * Resolved middleware function type at pipeline level.
 * Structurally equivalent to `MiddlewareFn` from `@banhmi/middleware`.
 */
export type PipelineMiddlewareFn = (
  req: Request,
  ctx: RouteCtx,
  next: () => Promise<Response>,
) => Promise<Response>

export interface RegisteredFilter {
  filterInstance: ExceptionFilter<unknown>
  type?: new (...args: unknown[]) => unknown
}

function serializeResult(
  result: unknown,
  status: number,
  headers: [string, string][],
): Response {
  let response: Response

  if (result instanceof StreamableFile) {
    const streamHeaders = new Headers()
    if (result.contentType)
      streamHeaders.set('content-type', result.contentType)
    if (result.disposition)
      streamHeaders.set('content-disposition', result.disposition)
    for (const [name, value] of headers) {
      streamHeaders.set(name, value)
    }
    return new Response(result.stream, { status, headers: streamHeaders })
  }

  if (result instanceof Response) {
    response = result
  } else if (result === undefined || result === null) {
    response = new Response(null, { status: status === 200 ? 204 : status })
  } else {
    response = Response.json(result, { status })
  }

  if (headers.length === 0) return response

  const cloned = new Response(response.body, response)
  for (const [name, value] of headers) {
    cloned.headers.set(name, value)
  }
  return cloned
}

/**
 * Runs the full enhancer pipeline for a matched route.
 *
 * Execution order:
 * 1. Middleware chain (module-level + controller-level + handler-level)
 * 2. Guards
 * 3. Interceptors (wrapped around the handler)
 * 4. Handler
 * 5. Exception filters (on error)
 *
 * Any middleware that does **not** call `next()` short-circuits the entire
 * pipeline and its returned `Response` is sent directly to the client.
 * Errors thrown inside middleware are caught by the filters chain.
 *
 * @param context - Execution context for the current request.
 * @param handler - The bound route handler function.
 * @param guards - Guards to run after all middleware pass.
 * @param interceptors - Interceptors wrapping the handler.
 * @param filters - Exception filters.
 * @param httpCode - HTTP status code for a successful response.
 * @param responseHeaders - Additional response headers to set.
 * @param middlewares - Optional ordered list of middleware functions to run before guards.
 */
export async function runEnhancerPipeline(
  context: ExecutionContext,
  handler: () => Promise<unknown>,
  guards: Guard[],
  interceptors: Interceptor[],
  filters: RegisteredFilter[],
  httpCode: number,
  responseHeaders: [string, string][],
  middlewares: PipelineMiddlewareFn[] = [],
): Promise<Response> {
  try {
    // Build the inner pipeline (guards → interceptors → handler → serialize)
    const innerPipeline = async (): Promise<Response> => {
      for (const guard of guards) {
        const allowed = await guard.canActivate(context)
        if (!allowed) throw new ForbiddenException()
      }

      const baseHandler: CallHandler = {
        handle: handler as () => Promise<Response>,
      }
      const chainedHandler = interceptors.reduceRight<CallHandler>(
        (next, interceptor) => ({
          handle: () => interceptor.intercept(context, next),
        }),
        baseHandler,
      )

      const result = await chainedHandler.handle()
      return serializeResult(result, httpCode, responseHeaders)
    }

    // Wrap the inner pipeline with the middleware chain
    if (middlewares.length === 0) {
      return await innerPipeline()
    }

    const ctx = context.getCtx()
    const req = ctx.request

    const runMiddleware = (index: number): Promise<Response> => {
      if (index >= middlewares.length) return innerPipeline()
      const mw = middlewares[index]
      return mw(req, ctx, () => runMiddleware(index + 1))
    }

    return await runMiddleware(0)
  } catch (error) {
    for (const { filterInstance, type } of filters) {
      if (!type || error instanceof type) {
        return filterInstance.catch(error, context)
      }
    }
    return new GlobalExceptionFilter().catch(error, context)
  }
}
