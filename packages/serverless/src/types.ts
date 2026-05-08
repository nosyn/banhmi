/**
 * Types for `@banhmi/serverless`.
 *
 * @module
 */

/**
 * API Gateway v1 event shape (REST API).
 *
 * @example
 * const event: ApiGatewayV1Event = {
 *   httpMethod: 'GET',
 *   path: '/cats',
 *   headers: {},
 *   queryStringParameters: null,
 *   body: null,
 *   isBase64Encoded: false,
 * }
 */
export interface ApiGatewayV1Event {
  /** HTTP method (uppercase), e.g. `'GET'`. */
  httpMethod: string
  /** Request path, e.g. `'/cats/1'`. */
  path: string
  /** Raw request headers (may be null). */
  headers: Record<string, string> | null
  /** Query string parameters (may be null). */
  queryStringParameters: Record<string, string> | null
  /** Raw body string (may be null or base64-encoded). */
  body: string | null
  /** Whether `body` is base64-encoded. */
  isBase64Encoded: boolean
}

/**
 * API Gateway v2 event shape (HTTP API).
 *
 * @example
 * const event: ApiGatewayV2Event = {
 *   requestContext: { http: { method: 'GET' } },
 *   rawPath: '/cats',
 *   headers: {},
 *   rawQueryString: '',
 *   body: undefined,
 *   isBase64Encoded: false,
 * }
 */
export interface ApiGatewayV2Event {
  requestContext: {
    http: {
      /** HTTP method (uppercase), e.g. `'GET'`. */
      method: string
    }
  }
  /** Request path (without query string), e.g. `'/cats/1'`. */
  rawPath: string
  /** Raw query string (without leading `?`). */
  rawQueryString?: string
  /** Request headers (may be undefined). */
  headers?: Record<string, string>
  /** Body (string or undefined). */
  body?: string
  /** Whether `body` is base64-encoded. */
  isBase64Encoded: boolean
}

/**
 * Union of API Gateway v1 and v2 event shapes.
 *
 * {@link createLambdaHandler} accepts either format and detects the version
 * by the presence of `requestContext.http.method` (v2) vs `httpMethod` (v1).
 *
 * @example
 * export const handler = await createLambdaHandler(AppModule)
 * // handler(event: ApiGatewayEvent, context: unknown) => Promise<LambdaResult>
 */
export type ApiGatewayEvent = ApiGatewayV1Event | ApiGatewayV2Event

/**
 * Response shape returned by the Lambda handler to API Gateway.
 *
 * @example
 * const result: LambdaResult = {
 *   statusCode: 200,
 *   headers: { 'content-type': 'application/json' },
 *   body: '{"id":1}',
 *   isBase64Encoded: false,
 * }
 */
export interface LambdaResult {
  /** HTTP status code, e.g. `200`. */
  statusCode: number
  /** Response headers. */
  headers: Record<string, string>
  /** Response body (string, possibly base64-encoded). */
  body: string
  /** Whether `body` is base64-encoded. */
  isBase64Encoded: boolean
}

/**
 * Options accepted by {@link createLambdaHandler}.
 *
 * @example
 * const handler = await createLambdaHandler(AppModule, { binaryMimeTypes: ['image/png'] })
 */
export interface LambdaOptions {
  /**
   * MIME types whose response bodies should be base64-encoded in the
   * `LambdaResult`.  Content types matching any of these values will have
   * `isBase64Encoded: true` and the body base64-encoded automatically.
   *
   * @default []
   */
  binaryMimeTypes?: string[]
}
