import { describe, expect, test } from 'bun:test'
import { Injectable, Token } from '@bunnest/common'
import { Container } from '../src/container'

describe('Container', () => {
  test('resolves a class provider as singleton', () => {
    @Injectable()
    class SomeService {
      static inject = [] as const
      value = Math.random()
    }

    const container = new Container()
    container.register(SomeService)

    const a = container.resolve(SomeService)
    const b = container.resolve(SomeService)
    expect(a).toBe(b)
    expect(a).toBeInstanceOf(SomeService)
  })

  test('resolves a value provider', () => {
    const GREETING = Token<string>('greeting')
    const container = new Container()
    container.register({ provide: GREETING, useValue: 'hello' })

    expect(container.resolve(GREETING)).toBe('hello')
  })

  test('resolves a factory provider', () => {
    const RAND = Token<number>('rand')
    const container = new Container()
    container.register({ provide: RAND, useFactory: () => 42 })

    expect(container.resolve(RAND)).toBe(42)
  })

  test('injects dependencies between classes', () => {
    @Injectable()
    class Logger {
      static inject = [] as const
      log(msg: string) { return msg }
    }

    @Injectable()
    class AppService {
      static inject = [Logger] as const
      constructor(readonly logger: Logger) {}
    }

    const container = new Container()
    container.register(Logger)
    container.register(AppService)

    const service = container.resolve(AppService)
    expect(service.logger).toBeInstanceOf(Logger)
    expect(service.logger.log('hi')).toBe('hi')
  })

  test('throws when token not registered', () => {
    const MISSING = Token<string>('missing')
    const container = new Container()
    expect(() => container.resolve(MISSING)).toThrow()
  })

  test('factory provider with inject array', () => {
    const BASE_URL = Token<string>('baseUrl')
    const CLIENT_TOKEN = Token<{ url: string }>('client')

    const container = new Container()
    container.register({ provide: BASE_URL, useValue: 'https://api.example.com' })
    container.register({
      provide: CLIENT_TOKEN,
      useFactory: (url: unknown) => ({ url: url as string }),
      inject: [BASE_URL],
    })

    const client = container.resolve(CLIENT_TOKEN)
    expect(client.url).toBe('https://api.example.com')
  })

  test('singleton scope: factory called only once', () => {
    let callCount = 0
    const COUNTER = Token<number>('counter')
    const container = new Container()
    container.register({
      provide: COUNTER,
      useFactory: () => {
        callCount++
        return callCount
      },
    })

    container.resolve(COUNTER)
    container.resolve(COUNTER)
    expect(callCount).toBe(1)
  })
})
