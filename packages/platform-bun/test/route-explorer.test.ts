import { describe, expect, test } from 'bun:test'
import { Controller, Get, HttpCode, Post } from '@banhmi/common'
import type { RouteCtx } from '@banhmi/common'
import { RouteExplorer } from '../src/route-explorer'

describe('RouteExplorer', () => {
  test('extracts GET route', () => {
    @Controller('/cats')
    class CatsController {
      @Get('/:id')
      findOne(_ctx: RouteCtx) {
        return {}
      }
    }

    const instance = new CatsController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, CatsController)

    expect(routes).toHaveLength(1)
    expect(routes[0]?.method).toBe('GET')
    expect(routes[0]?.path).toBe('/cats/:id')
  })

  test('extracts multiple routes', () => {
    @Controller('/cats')
    class CatsController {
      @Get()
      findAll(_ctx: RouteCtx) {
        return []
      }

      @Post()
      create(_ctx: RouteCtx) {
        return {}
      }
    }

    const instance = new CatsController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, CatsController)

    expect(routes).toHaveLength(2)
    const methods = routes.map((r) => r.method)
    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
  })

  test('prefixes route path with controller prefix', () => {
    @Controller('/api/v1')
    class ApiController {
      @Get('/users')
      getUsers(_ctx: RouteCtx) {
        return []
      }
    }

    const instance = new ApiController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, ApiController)

    expect(routes[0]?.path).toBe('/api/v1/users')
  })

  test('respects @HttpCode', () => {
    @Controller('/cats')
    class CatsController {
      @Post()
      @HttpCode(201)
      create(_ctx: RouteCtx) {
        return {}
      }
    }

    const instance = new CatsController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, CatsController)

    expect(routes[0]?.httpCode).toBe(201)
  })

  test('empty route path uses controller prefix alone', () => {
    @Controller('/cats')
    class CatsController {
      @Get()
      findAll(_ctx: RouteCtx) {
        return []
      }
    }

    const instance = new CatsController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, CatsController)

    expect(routes[0]?.path).toBe('/cats')
  })

  test('empty prefix and empty route path produces root slash', () => {
    @Controller('')
    class RootController {
      @Get()
      index(_ctx: RouteCtx) {
        return {}
      }
    }

    const instance = new RootController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, RootController)

    expect(routes[0]?.path).toBe('/')
  })
})
