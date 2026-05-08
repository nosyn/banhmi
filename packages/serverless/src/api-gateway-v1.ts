import type { ApiGatewayV1Event } from './types'

/**
 * Convert an API Gateway v1 (REST API) event into a WinterCG `Request`.
 *
 * @param event - The API Gateway v1 event.
 * @param baseUrl - The base URL to use (typically `https://lambda.local`).
 * @returns A `Request` ready to dispatch through the Banhmi pipeline.
 *
 * @example
 * const req = v1EventToRequest(event, 'https://lambda.local')
 */
export function v1EventToRequest(
  event: ApiGatewayV1Event,
  baseUrl = 'https://lambda.local',
): Request {
  const qs = event.queryStringParameters
  const queryString = qs
    ? `?${new URLSearchParams(qs as Record<string, string>).toString()}`
    : ''
  const url = `${baseUrl}${event.path}${queryString}`

  const headers = new Headers((event.headers ?? {}) as Record<string, string>)

  let body: BodyInit | null = null
  if (event.body !== null && event.body !== undefined) {
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64')
    } else {
      body = event.body
    }
  }

  return new Request(url, {
    method: event.httpMethod,
    headers,
    body,
  })
}
