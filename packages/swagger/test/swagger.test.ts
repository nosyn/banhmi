import { afterEach, describe, expect, test } from 'bun:test'
import { Controller, Get, Module, Post } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { DocumentBuilder } from '../src/document-builder'
import { SwaggerExplorer } from '../src/explorer'
import { SwaggerModule } from '../src/swagger.module'
import type { OpenApiDocument } from '../src/types'

describe('DocumentBuilder', () => {
  test('builds a minimal OpenAPI document', () => {
    const doc = new DocumentBuilder()
      .setTitle('Test API')
      .setVersion('1.0.0')
      .build()

    expect(doc.openapi).toBe('3.1.0')
    expect(doc.info.title).toBe('Test API')
    expect(doc.info.version).toBe('1.0.0')
    expect(doc.paths).toEqual({})
  })

  test('adds servers', () => {
    const doc = new DocumentBuilder()
      .setTitle('API')
      .setVersion('1')
      .addServer('https://api.example.com', 'Production')
      .build()

    expect(doc.servers?.[0]?.url).toBe('https://api.example.com')
    expect(doc.servers?.[0]?.description).toBe('Production')
  })

  test('addBearerAuth adds security scheme', () => {
    const doc = new DocumentBuilder()
      .setTitle('API')
      .setVersion('1')
      .addBearerAuth()
      .build()

    expect(doc.components?.securitySchemes?.['bearerAuth']).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
  })
})

describe('SwaggerExplorer', () => {
  test('adds paths from a controller', () => {
    @Controller('/cats')
    class CatsController {
      @Get('/')
      findAll() {}

      @Post('/')
      create() {}

      @Get('/:id')
      findOne() {}
    }

    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
      paths: {},
    }

    new SwaggerExplorer().explore([CatsController], doc)

    expect(doc.paths['/cats']).toBeDefined()
    expect((doc.paths['/cats'] as Record<string, unknown>)['get']).toBeDefined()
    expect(
      (doc.paths['/cats'] as Record<string, unknown>)['post'],
    ).toBeDefined()
    expect(doc.paths['/cats/{id}']).toBeDefined()
  })
})

describe('SwaggerModule.setup (integration)', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('serves OpenAPI JSON at /api-json', async () => {
    @Controller('/items')
    class ItemsController {
      @Get('/')
      findAll() {
        return []
      }
    }

    @Module({ controllers: [ItemsController] })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const doc = new DocumentBuilder()
      .setTitle('Items API')
      .setVersion('1')
      .build()
    SwaggerModule.setup('/api', app, doc)

    await app.listen(54410)

    const res = await fetch('http://localhost:54410/api-json')
    expect(res.status).toBe(200)
    const body = (await res.json()) as OpenApiDocument
    expect(body.info.title).toBe('Items API')
    expect(body.paths['/items']).toBeDefined()
  })
})
