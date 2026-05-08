import { describe, expect, test } from 'bun:test'
import { Ctx } from '../src/decorators/ctx'
import { EventPattern } from '../src/decorators/event-pattern'
import { MessagePattern } from '../src/decorators/message-pattern'
import { Payload } from '../src/decorators/payload'
import { EVENT_PATTERN_METADATA, MESSAGE_PATTERN_METADATA } from '../src/tokens'

describe('@MessagePattern', () => {
  test('stores pattern in Symbol.metadata', () => {
    class Handler {
      @MessagePattern('cats.findOne')
      findOne() {
        return null
      }
    }

    const meta = Handler[Symbol.metadata] as Record<symbol, unknown>
    const map = meta[MESSAGE_PATTERN_METADATA] as Record<string, string>
    expect(map.findOne).toBe('cats.findOne')
  })

  test('multiple patterns on different methods', () => {
    class Handler {
      @MessagePattern('cats.findAll')
      findAll() {
        return []
      }

      @MessagePattern('cats.create')
      create() {
        return null
      }
    }

    const meta = Handler[Symbol.metadata] as Record<symbol, unknown>
    const map = meta[MESSAGE_PATTERN_METADATA] as Record<string, string>
    expect(map.findAll).toBe('cats.findAll')
    expect(map.create).toBe('cats.create')
  })
})

describe('@EventPattern', () => {
  test('stores event pattern in Symbol.metadata', () => {
    class Handler {
      @EventPattern('user.created')
      onUserCreated() {}
    }

    const meta = Handler[Symbol.metadata] as Record<symbol, unknown>
    const map = meta[EVENT_PATTERN_METADATA] as Record<string, string>
    expect(map.onUserCreated).toBe('user.created')
  })

  test('does not pollute MessagePattern metadata', () => {
    class Handler {
      @EventPattern('user.deleted')
      onDeleted() {}
    }

    const meta = Handler[Symbol.metadata] as Record<symbol, unknown>
    expect(meta[MESSAGE_PATTERN_METADATA]).toBeUndefined()
    expect(
      (meta[EVENT_PATTERN_METADATA] as Record<string, string>).onDeleted,
    ).toBe('user.deleted')
  })
})

describe('@Payload and @Ctx', () => {
  test('@Payload is a no-op documentation decorator', () => {
    // Parameter decorators do not write to Symbol.metadata in Bun 1.3.x
    // Verify that applying @Payload does not throw
    class Handler {
      @MessagePattern('ping')
      handle(@Payload() _payload: string) {
        return null
      }
    }

    const meta = Handler[Symbol.metadata] as Record<symbol, unknown>
    // MessagePattern metadata is present
    expect(meta[MESSAGE_PATTERN_METADATA]).toBeDefined()
    // No crash, handler still works via calling convention (payload as arg 0)
    const instance = new Handler()
    expect(instance.handle('test')).toBeNull()
  })

  test('@Ctx is a no-op documentation decorator', () => {
    class Handler {
      @MessagePattern('echo')
      handle(@Payload() _payload: string, @Ctx() _ctx: unknown) {
        return null
      }
    }

    // Just verifying no throw on decoration
    const meta = Handler[Symbol.metadata] as Record<symbol, unknown>
    expect(meta[MESSAGE_PATTERN_METADATA]).toBeDefined()
  })
})
