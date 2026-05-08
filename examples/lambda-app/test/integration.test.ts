import { describe, expect, test } from 'bun:test'
import type { ApiGatewayV1Event, ApiGatewayV2Event } from '@banhmi/serverless'
import { createLambdaHandler } from '@banhmi/serverless'
import { AppModule } from '../src/app.module'

describe('lambda-app integration', () => {
  describe('API Gateway v1 events', () => {
    test('GET /items/ returns item list', async () => {
      const handler = await createLambdaHandler(AppModule)
      const event: ApiGatewayV1Event = {
        httpMethod: 'GET',
        path: '/items/',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
      }
      const result = await handler(event, {})
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body[0]).toMatchObject({ id: 1, label: 'First item' })
    })

    test('POST /items/ creates a new item', async () => {
      const handler = await createLambdaHandler(AppModule)
      const event: ApiGatewayV1Event = {
        httpMethod: 'POST',
        path: '/items/',
        headers: { 'content-type': 'application/json' },
        queryStringParameters: null,
        body: JSON.stringify({ label: 'New item' }),
        isBase64Encoded: false,
      }
      const result = await handler(event, {})
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body).toMatchObject({ label: 'New item' })
    })

    test('unknown route returns 404', async () => {
      const handler = await createLambdaHandler(AppModule)
      const event: ApiGatewayV1Event = {
        httpMethod: 'GET',
        path: '/no-such-route',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
      }
      const result = await handler(event, {})
      expect(result.statusCode).toBe(404)
    })
  })

  describe('API Gateway v2 events', () => {
    test('GET /items/ returns item list', async () => {
      const handler = await createLambdaHandler(AppModule)
      const event: ApiGatewayV2Event = {
        requestContext: { http: { method: 'GET' } },
        rawPath: '/items/',
        rawQueryString: '',
        headers: {},
        isBase64Encoded: false,
      }
      const result = await handler(event, {})
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(Array.isArray(body)).toBe(true)
    })

    test('result has correct LambdaResult shape', async () => {
      const handler = await createLambdaHandler(AppModule)
      const event: ApiGatewayV2Event = {
        requestContext: { http: { method: 'GET' } },
        rawPath: '/items/',
        rawQueryString: '',
        headers: {},
        isBase64Encoded: false,
      }
      const result = await handler(event, {})
      expect(typeof result.statusCode).toBe('number')
      expect(typeof result.body).toBe('string')
      expect(typeof result.headers).toBe('object')
      expect(typeof result.isBase64Encoded).toBe('boolean')
    })
  })
})
