import { afterEach, describe, expect, test } from 'bun:test'
import { Injectable, Module, Token } from '@banhmi/common'
import type { TestingModuleRef } from '../src/testing-module'
import { BanhmiTestingModule } from '../src/testing-module'

const GREETER = Token<{ greet: () => string }>('Greeter')

describe('BanhmiTestingModule', () => {
  let ref: TestingModuleRef | null = null

  afterEach(async () => {
    await ref?.close()
    ref = null
  })

  test('resolves a provider by class', async () => {
    @Injectable()
    class GreeterService {
      greet() {
        return 'hello'
      }
    }

    @Module({ providers: [GreeterService] })
    class AppModule {}

    ref = await BanhmiTestingModule.createTestingModule({
      imports: [AppModule],
    })
    const svc = ref.get(GreeterService)
    expect(svc.greet()).toBe('hello')
  })

  test('resolves a provider by token', async () => {
    @Module({
      providers: [{ provide: GREETER, useValue: { greet: () => 'hi' } }],
      exports: [GREETER],
    })
    class AppModule {}

    ref = await BanhmiTestingModule.createTestingModule({
      imports: [AppModule],
    })
    const svc = ref.get(GREETER)
    expect(svc.greet()).toBe('hi')
  })

  test('overrides a provider with a mock', async () => {
    @Injectable()
    class EmailService {
      send() {
        return 'real email sent'
      }
    }

    @Module({ providers: [EmailService] })
    class AppModule {}

    const mockEmail = { send: () => 'mock email sent' }
    ref = await BanhmiTestingModule.createTestingModule({
      imports: [AppModule],
      overrides: [{ token: EmailService, useValue: mockEmail }],
    })

    const svc = ref.get(EmailService) as EmailService
    expect(svc.send()).toBe('mock email sent')
  })

  test('can provide additional providers directly', async () => {
    @Module({})
    class EmptyModule {}

    const TOKEN = Token<number>('magicNumber')
    ref = await BanhmiTestingModule.createTestingModule({
      imports: [EmptyModule],
      providers: [{ provide: TOKEN, useValue: 42 }],
    })

    const val = ref.get(TOKEN) as number
    expect(val).toBe(42)
  })
})
