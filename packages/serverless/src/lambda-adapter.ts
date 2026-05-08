import type { AbstractConstructor } from '@banhmi/common'
import { BanhmiApplication, Container, ModuleGraph } from '@banhmi/core'
import { BunAdapter } from '@banhmi/platform-bun'
import { v1EventToRequest } from './api-gateway-v1'
import { v2EventToRequest } from './api-gateway-v2'
import type {
  ApiGatewayEvent,
  ApiGatewayV2Event,
  LambdaOptions,
  LambdaResult,
} from './types'

/**
 * Detect whether an event is API Gateway v2 format.
 *
 * v2 events have `requestContext.http.method`; v1 events have `httpMethod`.
 */
function isV2Event(event: ApiGatewayEvent): event is ApiGatewayV2Event {
  return (
    'requestContext' in event &&
    typeof (event as ApiGatewayV2Event).requestContext?.http?.method ===
      'string'
  )
}

/**
 * Convert a WinterCG `Response` to an API Gateway `LambdaResult`.
 *
 * Binary content types are base64-encoded automatically when the response
 * `content-type` matches an entry in `binaryMimeTypes`.
 *
 * @param response - The `Response` from the Banhmi pipeline.
 * @param binaryMimeTypes - MIME types whose bodies should be base64-encoded.
 * @returns A `LambdaResult` ready to return from the Lambda handler.
 */
async function responseToLambdaResult(
  response: Response,
  binaryMimeTypes: string[],
): Promise<LambdaResult> {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  const contentType = response.headers.get('content-type') ?? ''
  const isBinary = binaryMimeTypes.some((mime) =>
    contentType.toLowerCase().includes(mime.toLowerCase()),
  )

  let body: string
  let isBase64Encoded: boolean

  if (isBinary) {
    const buf = await response.arrayBuffer()
    body = Buffer.from(buf).toString('base64')
    isBase64Encoded = true
  } else {
    body = await response.text()
    isBase64Encoded = false
  }

  return {
    statusCode: response.status,
    headers,
    body,
    isBase64Encoded,
  }
}

/**
 * Build a Lambda handler that translates API Gateway v1 or v2 events into
 * the framework's request pipeline.
 *
 * The handler is bootstrapped once and reused across warm invocations, making
 * it safe to share a single handler instance at module scope.
 *
 * @param AppModule - The root `@Module`-decorated class.
 * @param opts - Optional Lambda-specific configuration.
 * @returns A `(event, context) => Promise<LambdaResult>` Lambda handler.
 *
 * @example
 * import { createLambdaHandler } from '@banhmi/serverless'
 * import { AppModule } from './app.module'
 * export const handler = await createLambdaHandler(AppModule)
 */
export async function createLambdaHandler(
  AppModule: AbstractConstructor,
  opts?: LambdaOptions,
): Promise<
  (event: ApiGatewayEvent, context: unknown) => Promise<LambdaResult>
> {
  const binaryMimeTypes = opts?.binaryMimeTypes ?? []

  const graph = new ModuleGraph()
  const moduleTree = graph.buildTree(AppModule)

  const container = new Container()
  const allProviders = graph.flattenProviders(moduleTree)
  for (const provider of allProviders) {
    container.register(provider)
  }

  const adapter = new BunAdapter()
  const app = new BanhmiApplication(container, moduleTree, adapter)
  await app.init()

  return async (
    event: ApiGatewayEvent,
    _context: unknown,
  ): Promise<LambdaResult> => {
    const request = isV2Event(event)
      ? v2EventToRequest(event)
      : v1EventToRequest(event)

    const response = await adapter.dispatchRequest(request)
    return responseToLambdaResult(response, binaryMimeTypes)
  }
}
