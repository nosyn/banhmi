import { ForbiddenException } from '@banhmi/common'
import type {
  CallHandler,
  ExceptionFilter,
  ExecutionContext,
  Guard,
  Interceptor,
} from '@banhmi/common'
import { GlobalExceptionFilter } from './global-filter'

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

export async function runEnhancerPipeline(
  context: ExecutionContext,
  handler: () => Promise<unknown>,
  guards: Guard[],
  interceptors: Interceptor[],
  filters: RegisteredFilter[],
  httpCode: number,
  responseHeaders: [string, string][],
): Promise<Response> {
  try {
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
  } catch (error) {
    for (const { filterInstance, type } of filters) {
      if (!type || error instanceof type) {
        return filterInstance.catch(error, context)
      }
    }
    return new GlobalExceptionFilter().catch(error, context)
  }
}
