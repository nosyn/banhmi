import { ForbiddenException, StreamableFile } from '@banhmi/common'
import { GlobalExceptionFilter } from './global-filter'

function serializeResult(result, status, headers) {
  let response
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
export async function runEnhancerPipeline(
  context,
  handler,
  guards,
  interceptors,
  filters,
  httpCode,
  responseHeaders,
) {
  try {
    for (const guard of guards) {
      const allowed = await guard.canActivate(context)
      if (!allowed) throw new ForbiddenException()
    }
    const baseHandler = {
      handle: handler,
    }
    const chainedHandler = interceptors.reduceRight(
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
