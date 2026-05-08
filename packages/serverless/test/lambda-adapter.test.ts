import { describe, expect, test } from 'bun:test'
import {
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Post,
} from '@banhmi/common'
import { createLambdaHandler } from '../src/lambda-adapter'
import type { ApiGatewayV1Event, ApiGatewayV2Event } from '../src/types'

// ─── Domain ───────────────────────────────────────────────────────────────────

interface Cat {
  id: number
  name: string
}

@Injectable()
class CatsService {
  private store = new Map<number, Cat>([[1, { id: 1, name: 'Tom' }]])

  findAll(): Cat[] {
    return [...this.store.values()]
  }

  findOne(id: number): Cat {
    const cat = this.store.get(id)
    if (!cat) throw new NotFoundException(`Cat #${id} not found`)
    return cat
  }

  create(name: string): Cat {
    const id = this.store.size + 1
    const cat: Cat = { id, name }
    this.store.set(id, cat)
    return cat
  }
}

@Controller('/cats')
class CatsController {
  static inject = [CatsService] as const

  constructor(private svc: CatsService) {}

  @Get('/')
  findAll(): Cat[] {
    return this.svc.findAll()
  }

  @Get('/:id')
  findOne(ctx: { params: Record<string, string> }): Cat {
    return this.svc.findOne(Number(ctx.params['id']))
  }

  @Post('/')
  @HttpCode(201)
  async create(ctx: { json<T>(): Promise<T> }): Promise<Cat> {
    const body = await ctx.json<{ name: string }>()
    return this.svc.create(body.name)
  }
}

@Module({ controllers: [CatsController], providers: [CatsService] })
class AppModule {}

// ─── Helper events ────────────────────────────────────────────────────────────

function v1Get(path: string): ApiGatewayV1Event {
  return {
    httpMethod: 'GET',
    path,
    headers: { 'content-type': 'application/json' },
    queryStringParameters: null,
    body: null,
    isBase64Encoded: false,
  }
}

function v1Post(path: string, body: unknown): ApiGatewayV1Event {
  return {
    httpMethod: 'POST',
    path,
    headers: { 'content-type': 'application/json' },
    queryStringParameters: null,
    body: JSON.stringify(body),
    isBase64Encoded: false,
  }
}

function v2Get(rawPath: string): ApiGatewayV2Event {
  return {
    requestContext: { http: { method: 'GET' } },
    rawPath,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    body: undefined,
    isBase64Encoded: false,
  }
}

function v2Post(rawPath: string, body: unknown): ApiGatewayV2Event {
  return {
    requestContext: { http: { method: 'POST' } },
    rawPath,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createLambdaHandler', () => {
  describe('API Gateway v1', () => {
    test('GET /cats/ returns 200 LambdaResult', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v1Get('/cats/'), {})
      expect(result.statusCode).toBe(200)
      expect(result.isBase64Encoded).toBe(false)
      const body = JSON.parse(result.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body[0]).toMatchObject({ id: 1, name: 'Tom' })
    })

    test('GET /cats/:id returns the correct cat', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v1Get('/cats/1'), {})
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body).toMatchObject({ id: 1, name: 'Tom' })
    })

    test('unknown path returns 404 LambdaResult', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v1Get('/unknown'), {})
      expect(result.statusCode).toBe(404)
    })

    test('POST /cats/ creates cat and returns 201', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v1Post('/cats/', { name: 'Whiskers' }), {})
      expect(result.statusCode).toBe(201)
      const body = JSON.parse(result.body)
      expect(body).toMatchObject({ name: 'Whiskers' })
    })

    test('LambdaResult has headers object', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v1Get('/cats/'), {})
      expect(typeof result.headers).toBe('object')
    })
  })

  describe('API Gateway v2', () => {
    test('GET /cats/ returns 200 LambdaResult', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v2Get('/cats/'), {})
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(Array.isArray(body)).toBe(true)
    })

    test('GET /cats/:id returns 200', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v2Get('/cats/1'), {})
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body).toMatchObject({ name: 'Tom' })
    })

    test('POST /cats/ creates cat and returns 201', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v2Post('/cats/', { name: 'Shadow' }), {})
      expect(result.statusCode).toBe(201)
      const body = JSON.parse(result.body)
      expect(body).toMatchObject({ name: 'Shadow' })
    })

    test('unknown path returns 404', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v2Get('/no-such-route'), {})
      expect(result.statusCode).toBe(404)
    })
  })

  describe('binary mime types', () => {
    test('non-binary content is not base64-encoded by default', async () => {
      const handler = await createLambdaHandler(AppModule)
      const result = await handler(v1Get('/cats/'), {})
      expect(result.isBase64Encoded).toBe(false)
    })

    test('binary content type option base64-encodes the body', async () => {
      const handler = await createLambdaHandler(AppModule, {
        binaryMimeTypes: ['application/json'],
      })
      const result = await handler(v1Get('/cats/'), {})
      expect(result.isBase64Encoded).toBe(true)
      // Body should be valid base64
      expect(() => Buffer.from(result.body, 'base64')).not.toThrow()
    })
  })
})
