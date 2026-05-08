import { describe, expect, test } from 'bun:test'
import { Controller, Get, Module, Post } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import {
  API_BODY_METADATA,
  API_EXCLUDE_ENDPOINT_METADATA,
  API_EXTRA_MODELS_METADATA,
  API_HIDE_PROPERTY_METADATA,
  API_OPERATION_METADATA,
  API_PARAMS_METADATA,
  API_PROPERTY_METADATA,
  API_QUERY_METADATA,
  API_RESPONSES_METADATA,
  API_SECURITY_METADATA,
  API_TAGS_METADATA,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiExcludeEndpoint,
  ApiExtraModels,
  ApiHideProperty,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '../src/decorators'
import { DocumentBuilder } from '../src/document-builder'
import { SwaggerExplorer } from '../src/explorer'
import type { OpenApiDocument } from '../src/types'

// ---------------------------------------------------------------------------
// @ApiTags
// ---------------------------------------------------------------------------
describe('@ApiTags', () => {
  test('writes tag names to Symbol.metadata', () => {
    @ApiTags('cats', 'animals')
    @Controller('/cats')
    class CatsController {}

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown>
    expect(meta[API_TAGS_METADATA]).toEqual(['cats', 'animals'])
  })
})

// ---------------------------------------------------------------------------
// @ApiOperation
// ---------------------------------------------------------------------------
describe('@ApiOperation', () => {
  test('writes operation metadata indexed by method name', () => {
    class OpsController {
      @ApiOperation({ summary: 'List cats', deprecated: false })
      @Get()
      findAll() {}
    }

    const meta = OpsController[Symbol.metadata] as Record<symbol, unknown>
    const ops = meta[API_OPERATION_METADATA] as Record<string, unknown>
    expect(ops['findAll']).toMatchObject({ summary: 'List cats', deprecated: false })
  })
})

// ---------------------------------------------------------------------------
// @ApiParam
// ---------------------------------------------------------------------------
describe('@ApiParam', () => {
  test('writes param array indexed by method name', () => {
    class ParamController {
      @ApiParam({ name: 'id', type: 'string', required: true })
      @Get('/:id')
      findOne() {}
    }

    const meta = ParamController[Symbol.metadata] as Record<symbol, unknown>
    const params = meta[API_PARAMS_METADATA] as Record<string, unknown[]>
    expect(params['findOne']).toHaveLength(1)
    expect(params['findOne'][0]).toMatchObject({ name: 'id', type: 'string' })
  })
})

// ---------------------------------------------------------------------------
// @ApiQuery
// ---------------------------------------------------------------------------
describe('@ApiQuery', () => {
  test('writes query param array indexed by method name', () => {
    class QueryController {
      @ApiQuery({ name: 'limit', type: 'number', required: false })
      @Get()
      findAll() {}
    }

    const meta = QueryController[Symbol.metadata] as Record<symbol, unknown>
    const queries = meta[API_QUERY_METADATA] as Record<string, unknown[]>
    expect(queries['findAll']).toHaveLength(1)
    expect(queries['findAll'][0]).toMatchObject({ name: 'limit', type: 'number' })
  })
})

// ---------------------------------------------------------------------------
// @ApiBody
// ---------------------------------------------------------------------------
describe('@ApiBody', () => {
  test('writes body metadata indexed by method name', () => {
    class BodyController {
      @ApiBody({ type: 'object', description: 'Cat data', required: true })
      @Post()
      create() {}
    }

    const meta = BodyController[Symbol.metadata] as Record<symbol, unknown>
    const body = meta[API_BODY_METADATA] as Record<string, unknown>
    expect(body['create']).toMatchObject({ type: 'object', description: 'Cat data' })
  })
})

// ---------------------------------------------------------------------------
// @ApiResponse
// ---------------------------------------------------------------------------
describe('@ApiResponse', () => {
  test('writes response array indexed by method name', () => {
    class ResController {
      @ApiResponse({ status: 200, description: 'Success' })
      @ApiResponse({ status: 404, description: 'Not found' })
      @Get('/:id')
      findOne() {}
    }

    const meta = ResController[Symbol.metadata] as Record<symbol, unknown>
    const responses = meta[API_RESPONSES_METADATA] as Record<string, unknown[]>
    expect(responses['findOne']).toHaveLength(2)
    // Decorators execute bottom-up, so 404 is first
    const statuses = responses['findOne'].map((r) => (r as { status: number }).status)
    expect(statuses).toContain(200)
    expect(statuses).toContain(404)
  })
})

// ---------------------------------------------------------------------------
// Security decorators
// ---------------------------------------------------------------------------
describe('@ApiBearerAuth / @ApiCookieAuth / @ApiSecurity', () => {
  test('@ApiBearerAuth writes security array to metadata', () => {
    @ApiBearerAuth()
    @Controller('/admin')
    class AdminController {}

    const meta = AdminController[Symbol.metadata] as Record<symbol, unknown>
    const sec = meta[API_SECURITY_METADATA] as Array<Record<string, string[]>>
    expect(sec).toContainEqual({ bearerAuth: [] })
  })

  test('@ApiCookieAuth writes cookie auth to metadata', () => {
    @ApiCookieAuth('sessionId')
    @Controller('/profile')
    class ProfileController {}

    const meta = ProfileController[Symbol.metadata] as Record<symbol, unknown>
    const sec = meta[API_SECURITY_METADATA] as Array<Record<string, string[]>>
    expect(sec).toContainEqual({ sessionId: [] })
  })

  test('@ApiSecurity writes named security to metadata', () => {
    @ApiSecurity('oauth2')
    @Controller('/oauth')
    class OAuthController {}

    const meta = OAuthController[Symbol.metadata] as Record<symbol, unknown>
    const sec = meta[API_SECURITY_METADATA] as Array<Record<string, string[]>>
    expect(sec).toContainEqual({ oauth2: [] })
  })
})

// ---------------------------------------------------------------------------
// @ApiExcludeEndpoint
// ---------------------------------------------------------------------------
describe('@ApiExcludeEndpoint', () => {
  test('marks method name in exclude set', () => {
    class ExcludeController {
      @ApiExcludeEndpoint()
      @Get('/internal')
      internal() {}
    }

    const meta = ExcludeController[Symbol.metadata] as Record<symbol, unknown>
    const excluded = meta[API_EXCLUDE_ENDPOINT_METADATA] as Set<string>
    expect(excluded.has('internal')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// @ApiExtraModels
// ---------------------------------------------------------------------------
describe('@ApiExtraModels', () => {
  test('adds extra model classes to metadata', () => {
    class PaginationDto {}

    @ApiExtraModels(PaginationDto)
    @Controller('/cats')
    class CatsController {}

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown>
    const models = meta[API_EXTRA_MODELS_METADATA] as Function[]
    expect(models).toContain(PaginationDto)
  })
})

// ---------------------------------------------------------------------------
// @ApiHideProperty
// ---------------------------------------------------------------------------
describe('@ApiHideProperty', () => {
  test('adds property name to hidden set', () => {
    class Cat {
      @ApiHideProperty()
      internalId: number = 0
    }

    const meta = Cat[Symbol.metadata] as Record<symbol, unknown>
    const hidden = meta[API_HIDE_PROPERTY_METADATA] as Set<string>
    expect(hidden.has('internalId')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// @ApiProperty
// ---------------------------------------------------------------------------
describe('@ApiProperty', () => {
  test('writes property options indexed by field name', () => {
    class Cat {
      @ApiProperty({ type: 'string', example: 'Whiskers', description: 'Cat name' })
      name: string = ''

      @ApiProperty({ type: 'number', required: false })
      age?: number
    }

    const meta = Cat[Symbol.metadata] as Record<symbol, unknown>
    const props = meta[API_PROPERTY_METADATA] as Record<string, unknown>
    expect(props['name']).toMatchObject({ type: 'string', example: 'Whiskers' })
    expect(props['age']).toMatchObject({ type: 'number', required: false })
  })
})

// ---------------------------------------------------------------------------
// SwaggerExplorer integration with new decorators
// ---------------------------------------------------------------------------
describe('SwaggerExplorer with decorators', () => {
  test('includes tags from @ApiTags', () => {
    @ApiTags('pets')
    @Controller('/cats')
    class CatsController {
      @Get('/')
      findAll() {}
    }

    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
      paths: {},
    }
    new SwaggerExplorer().explore([CatsController], doc)

    const op = (doc.paths['/cats'] as Record<string, unknown>)['get'] as Record<string, unknown>
    expect(op.tags).toEqual(['pets'])
  })

  test('includes summary from @ApiOperation', () => {
    @Controller('/cats')
    class CatsController {
      @ApiOperation({ summary: 'List all cats' })
      @Get('/')
      findAll() {}
    }

    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
      paths: {},
    }
    new SwaggerExplorer().explore([CatsController], doc)

    const op = (doc.paths['/cats'] as Record<string, unknown>)['get'] as Record<string, unknown>
    expect(op.summary).toBe('List all cats')
  })

  test('includes parameters from @ApiParam and @ApiQuery', () => {
    @Controller('/cats')
    class CatsController {
      @ApiParam({ name: 'id', type: 'string', required: true })
      @ApiQuery({ name: 'format', type: 'string', required: false })
      @Get('/:id')
      findOne() {}
    }

    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
      paths: {},
    }
    new SwaggerExplorer().explore([CatsController], doc)

    const op = (doc.paths['/cats/{id}'] as Record<string, unknown>)['get'] as Record<string, unknown>
    const params = op.parameters as Array<Record<string, unknown>>
    expect(params.find((p) => p['name'] === 'id')).toBeDefined()
    expect(params.find((p) => p['name'] === 'format')).toBeDefined()
  })

  test('excludes endpoint marked with @ApiExcludeEndpoint', () => {
    @Controller('/cats')
    class CatsController {
      @Get('/')
      findAll() {}

      @ApiExcludeEndpoint()
      @Get('/internal')
      internal() {}
    }

    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
      paths: {},
    }
    new SwaggerExplorer().explore([CatsController], doc)

    expect(doc.paths['/cats/internal']).toBeUndefined()
    expect(doc.paths['/cats']).toBeDefined()
  })

  test('includes responses from @ApiResponse', () => {
    @Controller('/cats')
    class CatsController {
      @ApiResponse({ status: 200, description: 'Cat list' })
      @ApiResponse({ status: 401, description: 'Unauthorized' })
      @Get('/')
      findAll() {}
    }

    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
      paths: {},
    }
    new SwaggerExplorer().explore([CatsController], doc)

    const op = (doc.paths['/cats'] as Record<string, unknown>)['get'] as Record<string, unknown>
    const responses = op.responses as Record<string, unknown>
    expect(responses['200']).toBeDefined()
    expect(responses['401']).toBeDefined()
  })
})
