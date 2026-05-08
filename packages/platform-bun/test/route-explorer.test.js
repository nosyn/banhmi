import { describe, expect, test } from 'bun:test'
import {
  Controller,
  Get,
  HttpCode,
  Post,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@banhmi/common'
import { RouteExplorer } from '../src/route-explorer'

describe('RouteExplorer', () => {
  test('extracts GET route', () => {
    @Controller('/cats')
    class CatsController {
      @Get('/:id')
      findOne(_ctx) {
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
      findAll(_ctx) {
        return []
      }
      @Post()
      create(_ctx) {
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
      getUsers(_ctx) {
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
      create(_ctx) {
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
      findAll(_ctx) {
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
      index(_ctx) {
        return {}
      }
    }
    const instance = new RootController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, RootController)
    expect(routes[0]?.path).toBe('/')
  })
})
describe('RouteExplorer — method-level guards', () => {
  test('method guard appears only on the decorated route', () => {
    class AuthGuard {
      async canActivate(_ctx) {
        return true
      }
    }
    @Controller('/items')
    class ItemsController {
      @UseGuards(AuthGuard)
      @Get('/secure')
      secure() {}
      @Get('/open')
      open() {}
    }
    const explorer = new RouteExplorer()
    const routes = explorer.explore(new ItemsController(), ItemsController)
    const secure = routes.find((r) => r.path === '/items/secure')
    const open = routes.find((r) => r.path === '/items/open')
    expect(secure?.guards).toContain(AuthGuard)
    expect(open?.guards).not.toContain(AuthGuard)
  })
  test('class guard applies to all routes, method guard only to its route', () => {
    class ClassGuard {
      async canActivate(_ctx) {
        return true
      }
    }
    class MethodGuard {
      async canActivate(_ctx) {
        return true
      }
    }
    @UseGuards(ClassGuard)
    @Controller('/items')
    class ItemsController {
      @UseGuards(MethodGuard)
      @Get('/restricted')
      restricted() {}
      @Get('/free')
      free() {}
    }
    const explorer = new RouteExplorer()
    const routes = explorer.explore(new ItemsController(), ItemsController)
    const restricted = routes.find((r) => r.path === '/items/restricted')
    const free = routes.find((r) => r.path === '/items/free')
    // Order matters: RouteExplorer builds [...classGuards, ...(methodGuardsMap[methodName] ?? [])],
    // so class-level guards always precede method-level guards in the pipeline.
    expect(restricted?.guards).toEqual([ClassGuard, MethodGuard])
    expect(free?.guards).toEqual([ClassGuard])
  })
  test('method interceptor appears only on the decorated route', () => {
    class TimingInterceptor {
      intercept(_ctx, next) {
        return next.handle()
      }
    }
    @Controller('/items')
    class ItemsController {
      @UseInterceptors(TimingInterceptor)
      @Get('/timed')
      timed() {}
      @Get('/plain')
      plain() {}
    }
    const explorer = new RouteExplorer()
    const routes = explorer.explore(new ItemsController(), ItemsController)
    const timed = routes.find((r) => r.path === '/items/timed')
    const plain = routes.find((r) => r.path === '/items/plain')
    expect(timed?.interceptors).toContain(TimingInterceptor)
    expect(plain?.interceptors).not.toContain(TimingInterceptor)
  })
  test('method filter appears only on the decorated route', () => {
    class CustomFilter {
      catch(_err, _ctx) {
        return new Response('err')
      }
    }
    @Controller('/items')
    class ItemsController {
      @UseFilters(CustomFilter)
      @Get('/filtered')
      filtered() {}
      @Get('/unfiltered')
      unfiltered() {}
    }
    const explorer = new RouteExplorer()
    const routes = explorer.explore(new ItemsController(), ItemsController)
    const filtered = routes.find((r) => r.path === '/items/filtered')
    const unfiltered = routes.find((r) => r.path === '/items/unfiltered')
    expect(filtered?.filters).toContain(CustomFilter)
    expect(unfiltered?.filters).not.toContain(CustomFilter)
  })
})
