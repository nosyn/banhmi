import { describe, expect, test } from 'bun:test'
import {
  SetMetadata,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '../../src/decorators/enhancers'
import { Header, HttpCode } from '../../src/decorators/http'
import {
  CUSTOM_ROUTE_METADATA,
  FILTERS_METADATA,
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  INTERCEPTORS_METADATA,
  METHOD_FILTERS_METADATA,
  METHOD_GUARDS_METADATA,
  METHOD_INTERCEPTORS_METADATA,
  RESPONSE_HEADERS_METADATA,
} from '../../src/metadata-keys'

describe('@HttpCode', () => {
  test('stores status code on method metadata', () => {
    class Ctrl {
      @HttpCode(201)
      create() {}
    }
    const meta = Ctrl[Symbol.metadata]
    expect(meta?.[HTTP_CODE_METADATA]).toEqual({ create: 201 })
  })
})
describe('@Header', () => {
  test('stores header on method metadata', () => {
    class Ctrl {
      @Header('Cache-Control', 'no-cache')
      findAll() {}
    }
    const meta = Ctrl[Symbol.metadata]
    const headers = meta?.[RESPONSE_HEADERS_METADATA]
    expect(headers?.findAll).toContainEqual(['Cache-Control', 'no-cache'])
  })
})
describe('@UseGuards', () => {
  test('stores guards on class metadata', () => {
    class AuthGuard {}
    @UseGuards(AuthGuard)
    class Ctrl {}
    const meta = Ctrl[Symbol.metadata]
    expect(meta?.[GUARDS_METADATA]).toContain(AuthGuard)
  })
})
describe('@UseInterceptors', () => {
  test('stores interceptors on class metadata', () => {
    class LoggingInterceptor {}
    @UseInterceptors(LoggingInterceptor)
    class Ctrl {}
    const meta = Ctrl[Symbol.metadata]
    expect(meta?.[INTERCEPTORS_METADATA]).toContain(LoggingInterceptor)
  })
})
describe('@SetMetadata', () => {
  test('stores custom metadata on method', () => {
    class Ctrl {
      @SetMetadata('roles', ['admin'])
      findAll() {}
    }
    const meta = Ctrl[Symbol.metadata]
    const custom = meta?.[CUSTOM_ROUTE_METADATA]
    expect(custom?.findAll?.roles).toEqual(['admin'])
  })
})
describe('@UseGuards on method', () => {
  test('stores guards in per-method record', () => {
    class RoleGuard {}
    class Ctrl {
      @UseGuards(RoleGuard)
      findAll() {}
    }
    const meta = Ctrl[Symbol.metadata]
    const map = meta?.[METHOD_GUARDS_METADATA]
    expect(map?.findAll).toContain(RoleGuard)
  })
  test('does not pollute class-level GUARDS_METADATA', () => {
    class RoleGuard {}
    class Ctrl {
      @UseGuards(RoleGuard)
      findAll() {}
    }
    const meta = Ctrl[Symbol.metadata]
    expect(meta?.[GUARDS_METADATA]).toBeUndefined()
  })
  test('method guards are isolated per method', () => {
    class GuardA {}
    class GuardB {}
    class Ctrl {
      @UseGuards(GuardA)
      findAll() {}
      @UseGuards(GuardB)
      findOne() {}
    }
    const meta = Ctrl[Symbol.metadata]
    const map = meta?.[METHOD_GUARDS_METADATA]
    expect(map?.findAll).toContain(GuardA)
    expect(map?.findAll).not.toContain(GuardB)
    expect(map?.findOne).toContain(GuardB)
    expect(map?.findOne).not.toContain(GuardA)
  })
})
describe('@UseInterceptors on method', () => {
  test('stores interceptors in per-method record', () => {
    class LogInterceptor {}
    class Ctrl {
      @UseInterceptors(LogInterceptor)
      findAll() {}
    }
    const meta = Ctrl[Symbol.metadata]
    const map = meta?.[METHOD_INTERCEPTORS_METADATA]
    expect(map?.findAll).toContain(LogInterceptor)
  })
  test('does not pollute class-level INTERCEPTORS_METADATA', () => {
    class LogInterceptor {}
    class Ctrl {
      @UseInterceptors(LogInterceptor)
      findAll() {}
    }
    const meta = Ctrl[Symbol.metadata]
    expect(meta?.[INTERCEPTORS_METADATA]).toBeUndefined()
  })
})
describe('@UseFilters on method', () => {
  test('stores filters in per-method record', () => {
    class HttpFilter {}
    class Ctrl {
      @UseFilters(HttpFilter)
      findAll() {}
    }
    const meta = Ctrl[Symbol.metadata]
    const map = meta?.[METHOD_FILTERS_METADATA]
    expect(map?.findAll).toContain(HttpFilter)
  })
  test('does not pollute class-level FILTERS_METADATA', () => {
    class HttpFilter {}
    class Ctrl {
      @UseFilters(HttpFilter)
      findAll() {}
    }
    const meta = Ctrl[Symbol.metadata]
    expect(meta?.[FILTERS_METADATA]).toBeUndefined()
  })
})
describe('@UseGuards class + method combination', () => {
  test('class guard and method guard coexist independently', () => {
    class ClassGuard {}
    class MethodGuard {}
    @UseGuards(ClassGuard)
    class Ctrl {
      @UseGuards(MethodGuard)
      restricted() {}
      open() {}
    }
    const meta = Ctrl[Symbol.metadata]
    expect(meta?.[GUARDS_METADATA]).toContain(ClassGuard)
    const map = meta?.[METHOD_GUARDS_METADATA]
    expect(map?.restricted).toContain(MethodGuard)
    expect(map?.open).toBeUndefined()
  })
})
