import { describe, expect, test } from 'bun:test'
import { Delete, Get, Post } from '../../src/decorators/route'
import { ROUTE_METADATA } from '../../src/metadata-keys'

describe('route decorators', () => {
  test('@Get stores route definition', () => {
    class CatsController {
      @Get('/cats')
      findAll() {}
    }

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown> | null
    const routes = meta?.[ROUTE_METADATA] as Record<string, unknown> | undefined
    expect(routes?.['findAll']).toEqual({ method: 'GET', path: '/cats' })
  })

  test('@Post stores POST route', () => {
    class CatsController {
      @Post()
      create() {}
    }

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown> | null
    const routes = meta?.[ROUTE_METADATA] as Record<string, unknown> | undefined
    expect(routes?.['create']).toEqual({ method: 'POST', path: '' })
  })

  test('multiple routes on same controller', () => {
    class CatsController {
      @Get('/:id')
      findOne() {}

      @Delete('/:id')
      remove() {}
    }

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown> | null
    const routes = meta?.[ROUTE_METADATA] as Record<string, { method: string }> | undefined
    expect(routes?.['findOne']?.method).toBe('GET')
    expect(routes?.['remove']?.method).toBe('DELETE')
  })
})
