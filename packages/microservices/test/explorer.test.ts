import { describe, expect, test } from 'bun:test'
import { Ctx } from '../src/decorators/ctx'
import { EventPattern } from '../src/decorators/event-pattern'
import { MessagePattern } from '../src/decorators/message-pattern'
import { Payload } from '../src/decorators/payload'
import { MicroserviceExplorer } from '../src/explorer'
import type { MicroserviceMessage } from '../src/types'

describe('MicroserviceExplorer', () => {
  test('discovers @MessagePattern handlers', () => {
    class Handler {
      @MessagePattern('cats.findOne')
      findOne(_id: string) {
        return { id: _id, name: 'Tom' }
      }
    }

    const explorer = new MicroserviceExplorer()
    const instance = new Handler()
    const regs = explorer.explore([[instance, Handler]])

    expect(regs).toHaveLength(1)
    expect(regs[0]?.pattern).toBe('cats.findOne')
    expect(regs[0]?.isEvent).toBe(false)
  })

  test('discovers @EventPattern handlers', () => {
    class Handler {
      @EventPattern('user.created')
      onUserCreated(_data: unknown) {}
    }

    const explorer = new MicroserviceExplorer()
    const instance = new Handler()
    const regs = explorer.explore([[instance, Handler]])

    expect(regs).toHaveLength(1)
    expect(regs[0]?.pattern).toBe('user.created')
    expect(regs[0]?.isEvent).toBe(true)
  })

  test('MessagePattern handler returns data via calling convention', async () => {
    class Handler {
      @MessagePattern('cats.findOne')
      findOne(id: string) {
        return { id, name: 'Tom' }
      }
    }

    const explorer = new MicroserviceExplorer()
    const instance = new Handler()
    const [reg] = explorer.explore([[instance, Handler]])

    const result = await reg?.invoke({ pattern: 'cats.findOne', data: '1' })
    expect(result).toEqual({ data: { id: '1', name: 'Tom' } })
  })

  test('EventPattern handler returns undefined', async () => {
    const calls: unknown[] = []
    class Handler {
      @EventPattern('user.created')
      onUserCreated(data: unknown) {
        calls.push(data)
      }
    }

    const explorer = new MicroserviceExplorer()
    const instance = new Handler()
    const [reg] = explorer.explore([[instance, Handler]])

    const result = await reg?.invoke({
      pattern: 'user.created',
      data: { id: '1' },
    })
    expect(result).toBeUndefined()
    expect(calls).toEqual([{ id: '1' }])
  })

  test('handler error is caught and returned as error response', async () => {
    class Handler {
      @MessagePattern('bad')
      doIt(_: unknown) {
        throw Object.assign(new Error('Not found'), { status: 404 })
      }
    }

    const explorer = new MicroserviceExplorer()
    const instance = new Handler()
    const [reg] = explorer.explore([[instance, Handler]])

    const result = await reg?.invoke({ pattern: 'bad', data: null })
    expect(result?.error?.message).toBe('Not found')
    expect(result?.error?.status).toBe(404)
  })

  test('second argument is the full message context', async () => {
    const received: unknown[] = []
    class Handler {
      // @Ctx() is no-op; second arg is always the full message by convention
      @MessagePattern('echo')
      handle(payload: unknown, ctx: MicroserviceMessage) {
        received.push({ payload, ctx })
        return payload
      }
    }

    const explorer = new MicroserviceExplorer()
    const instance = new Handler()
    const [reg] = explorer.explore([[instance, Handler]])

    const msg: MicroserviceMessage = {
      pattern: 'echo',
      data: 'hello',
      correlationId: 'abc',
    }
    await reg?.invoke(msg)
    expect(received[0]).toMatchObject({
      payload: 'hello',
      ctx: msg,
    })
  })

  test('@Payload and @Ctx decorators are no-ops on parameters', async () => {
    // Using the decorators must not crash and the calling convention still works
    class Handler {
      @MessagePattern('greet')
      greet(@Payload() name: string, @Ctx() _ctx: unknown) {
        return `Hello ${name}`
      }
    }

    const explorer = new MicroserviceExplorer()
    const [reg] = explorer.explore([[new Handler(), Handler]])
    const result = await reg?.invoke({ pattern: 'greet', data: 'World' })
    expect(result?.data).toBe('Hello World')
  })

  test('no metadata → returns empty array', () => {
    class Plain {}
    const explorer = new MicroserviceExplorer()
    const regs = explorer.explore([[new Plain(), Plain]])
    expect(regs).toHaveLength(0)
  })
})
