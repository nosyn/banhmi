import { afterEach, describe, expect, test } from 'bun:test'
import { Controller, Get, Module, Post } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { DocumentBuilder } from '../src/document-builder'
import { SwaggerExplorer } from '../src/explorer'
import { SwaggerModule } from '../src/swagger.module'
import type { OpenApiDocument } from '../src/types'
import { renderScalarHtml } from '../src/ui/scalar'
import { renderSwaggerHtml } from '../src/ui/swagger'

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

    expect(doc.components?.securitySchemes?.bearerAuth).toEqual({
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
    expect((doc.paths['/cats'] as Record<string, unknown>).get).toBeDefined()
    expect((doc.paths['/cats'] as Record<string, unknown>).post).toBeDefined()
    expect(doc.paths['/cats/{id}']).toBeDefined()
  })
})

describe('renderScalarHtml', () => {
  test('contains Scalar CDN script tag', () => {
    const html = renderScalarHtml('/openapi.json')
    expect(html).toContain('https://cdn.jsdelivr.net/npm/@scalar/api-reference')
  })

  test('includes specUrl as data-url attribute', () => {
    const html = renderScalarHtml('/api/openapi.json')
    expect(html).toContain('data-url="/api/openapi.json"')
  })

  test('uses custom theme when provided', () => {
    const html = renderScalarHtml('/openapi.json', { theme: 'purple' })
    expect(html).toContain('"theme":"purple"')
  })

  test('uses custom title when provided', () => {
    const html = renderScalarHtml('/openapi.json', { title: 'My Docs' })
    expect(html).toContain('<title>My Docs</title>')
  })

  test('escapes HTML in title to prevent XSS', () => {
    const html = renderScalarHtml('/x', { title: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('renderSwaggerHtml', () => {
  test('contains Swagger UI bundle script tag', () => {
    const html = renderSwaggerHtml('/openapi.json')
    expect(html).toContain('swagger-ui-bundle.js')
  })

  test('includes specUrl in SwaggerUIBundle config', () => {
    const html = renderSwaggerHtml('/api/openapi.json')
    expect(html).toContain("url: '/api/openapi.json'")
  })
})

describe('SwaggerModule.setup (integration)', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('serves OpenAPI JSON at /api/openapi.json', async () => {
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

    const res = await fetch('http://localhost:54410/api/openapi.json')
    expect(res.status).toBe(200)
    const body = (await res.json()) as OpenApiDocument
    expect(body.info.title).toBe('Items API')
    expect(body.paths['/items']).toBeDefined()
  })

  test('serves Scalar UI at /api by default', async () => {
    @Controller('/x')
    class XController {
      @Get('/')
      list() {}
    }

    @Module({ controllers: [XController] })
    class XModule {}

    app = await BanhmiFactory.create(XModule)
    const doc = new DocumentBuilder().setTitle('X API').setVersion('1').build()
    SwaggerModule.setup('/api', app, doc)

    await app.listen(54411)

    const res = await fetch('http://localhost:54411/api')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('@scalar/api-reference')
  })

  test('serves Swagger UI when ui option is swagger', async () => {
    @Controller('/y')
    class YController {
      @Get('/')
      list() {}
    }

    @Module({ controllers: [YController] })
    class YModule {}

    app = await BanhmiFactory.create(YModule)
    const doc = new DocumentBuilder().setTitle('Y API').setVersion('1').build()
    SwaggerModule.setup('/api', app, doc, { ui: 'swagger' })

    await app.listen(54412)

    const res = await fetch('http://localhost:54412/api')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('swagger-ui-bundle.js')
  })
})
