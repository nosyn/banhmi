import { describe, expect, test } from 'bun:test'
import { SetMetadata, UseGuards, UseInterceptors } from '../../src/decorators/enhancers'
import { Header, HttpCode } from '../../src/decorators/http'
import {
  CUSTOM_ROUTE_METADATA,
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  INTERCEPTORS_METADATA,
  RESPONSE_HEADERS_METADATA,
} from '../../src/metadata-keys'

describe('@HttpCode', () => {
  test('stores status code on method metadata', () => {
    class Ctrl {
      @HttpCode(201)
      create() {}
    }

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[HTTP_CODE_METADATA]).toEqual({ create: 201 })
  })
})

describe('@Header', () => {
  test('stores header on method metadata', () => {
    class Ctrl {
      @Header('Cache-Control', 'no-cache')
      findAll() {}
    }

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    const headers = meta?.[RESPONSE_HEADERS_METADATA] as Record<string, [string, string][]> | undefined
    expect(headers?.['findAll']).toContainEqual(['Cache-Control', 'no-cache'])
  })
})

describe('@UseGuards', () => {
  test('stores guards on class metadata', () => {
    class AuthGuard {}

    @UseGuards(AuthGuard)
    class Ctrl {}

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[GUARDS_METADATA]).toContain(AuthGuard)
  })
})

describe('@UseInterceptors', () => {
  test('stores interceptors on class metadata', () => {
    class LoggingInterceptor {}

    @UseInterceptors(LoggingInterceptor)
    class Ctrl {}

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[INTERCEPTORS_METADATA]).toContain(LoggingInterceptor)
  })
})

describe('@SetMetadata', () => {
  test('stores custom metadata on method', () => {
    class Ctrl {
      @SetMetadata('roles', ['admin'])
      findAll() {}
    }

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    const custom = meta?.[CUSTOM_ROUTE_METADATA] as Record<string, Record<string, unknown>> | undefined
    expect(custom?.['findAll']?.['roles']).toEqual(['admin'])
  })
})
