import type { ApiGatewayV2Event } from './types'

/**
 * Convert an API Gateway v2 (HTTP API) event into a WinterCG `Request`.
 *
 * @param event - The API Gateway v2 event.
 * @param baseUrl - The base URL to use (typically `https://lambda.local`).
 * @returns A `Request` ready to dispatch through the Banhmi pipeline.
 *
 * @example
 * const req = v2EventToRequest(event, 'https://lambda.local')
 */
export function v2EventToRequest(
  event: ApiGatewayV2Event,
  baseUrl = 'https://lambda.local',
): Request {
  const qs = event.rawQueryString ? `?${event.rawQueryString}` : ''
  const url = `${baseUrl}${event.rawPath}${qs}`

  const headers = new Headers(event.headers ?? {})

  let body: BodyInit | null = null
  if (event.body !== undefined && event.body !== null) {
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64')
    } else {
      body = event.body
    }
  }

  return new Request(url, {
    method: event.requestContext.http.method,
    headers,
    body,
  })
}
