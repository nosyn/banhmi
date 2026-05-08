import { describe, expect, test } from 'bun:test'
import { Injectable, Token } from '@banhmi/common'
import { Container } from '../src/container'

describe('Container', () => {
  test('resolves a class provider as singleton', () => {
    @Injectable()
    class SomeService {
      static inject = []
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
    const GREETING = Token('greeting')
    const container = new Container()
    container.register({ provide: GREETING, useValue: 'hello' })
    expect(container.resolve(GREETING)).toBe('hello')
  })
  test('resolves a factory provider', () => {
    const RAND = Token('rand')
    const container = new Container()
    container.register({ provide: RAND, useFactory: () => 42 })
    expect(container.resolve(RAND)).toBe(42)
  })
  test('injects dependencies between classes', () => {
    @Injectable()
    class Logger {
      static inject = []
      log(msg) {
        return msg
      }
    }
    @Injectable()
    class AppService {
      logger
      static inject = [Logger]
      constructor(logger) {
        this.logger = logger
      }
    }
    const container = new Container()
    container.register(Logger)
    container.register(AppService)
    const service = container.resolve(AppService)
    expect(service.logger).toBeInstanceOf(Logger)
    expect(service.logger.log('hi')).toBe('hi')
  })
  test('throws when token not registered', () => {
    const MISSING = Token('missing')
    const container = new Container()
    expect(() => container.resolve(MISSING)).toThrow()
  })
  test('factory provider with inject array', () => {
    const BASE_URL = Token('baseUrl')
    const CLIENT_TOKEN = Token('client')
    const container = new Container()
    container.register({
      provide: BASE_URL,
      useValue: 'https://api.example.com',
    })
    container.register({
      provide: CLIENT_TOKEN,
      useFactory: (url) => ({ url: url }),
      inject: [BASE_URL],
    })
    const client = container.resolve(CLIENT_TOKEN)
    expect(client.url).toBe('https://api.example.com')
  })
  test('singleton scope: factory called only once', () => {
    let callCount = 0
    const COUNTER = Token('counter')
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
