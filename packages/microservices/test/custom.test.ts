import { describe, expect, test } from 'bun:test'
import { EventPattern } from '../src/decorators/event-pattern'
import { MessagePattern } from '../src/decorators/message-pattern'
import { customTransport, InMemoryTransport } from '../src/transports/custom'
import { MicroserviceServer } from '../src/server/server'

describe('InMemoryTransport', () => {
  test('send routes to listen handler and returns data', async () => {
    const transport = new InMemoryTransport()
    await transport.listen(async (msg) => ({ data: `echo:${String(msg.data)}` }))
    const res = await transport.send<string>('ping', 'hello')
    expect(res.data).toBe('echo:hello')
    await transport.close()
  })

  test('emit calls listener but handler returns undefined', async () => {
    const events: string[] = []
    const transport = new InMemoryTransport()
    await transport.listen(async (msg) => {
      events.push(msg.pattern)
      return undefined
    })
    await transport.emit('user.created', { id: '1' })
    expect(events).toEqual(['user.created'])
    await transport.close()
  })

  test('send after close throws', async () => {
    const transport = new InMemoryTransport()
    await transport.close()
    expect(transport.send('ping', null)).rejects.toThrow('not listening')
  })
})

describe('customTransport()', () => {
  test('wraps strategy methods', async () => {
    const calls: string[] = []
    const transport = customTransport({
      async listen(handler) {
        calls.push('listen')
        await handler({ pattern: 'x', data: null })
      },
      async close() {
        calls.push('close')
      },
      async send(_p, _d) {
        calls.push('send')
        return { data: 42 }
      },
      async emit(_p, _d) {
        calls.push('emit')
      },
    })

    await transport.listen(async () => undefined)
    await transport.emit('y', null)
    const res = await transport.send<number>('z', null)
    await transport.close()

    expect(calls).toEqual(['listen', 'emit', 'send', 'close'])
    expect(res.data).toBe(42)
  })
})

describe('MicroserviceServer with InMemoryTransport', () => {
  test('routes MessagePattern to handler', async () => {
    const transport = new InMemoryTransport()

    class CatsHandler {
      @MessagePattern('cats.findOne')
      findOne(id: string) {
        return { id, name: 'Tom' }
      }
    }

    const instance = new CatsHandler()
    const server = new MicroserviceServer(transport, [[instance, CatsHandler]])
    await server.start()

    const res = await transport.send<{ id: string; name: string }>(
      'cats.findOne',
      '42',
    )
    expect(res.data).toEqual({ id: '42', name: 'Tom' })
    await server.stop()
  })

  test('EventPattern handler runs without returning data', async () => {
    const transport = new InMemoryTransport()
    const received: unknown[] = []

    class UserHandler {
      @EventPattern('user.created')
      onCreated(data: unknown) {
        received.push(data)
      }
    }

    const instance = new UserHandler()
    const server = new MicroserviceServer(transport, [[instance, UserHandler]])
    await server.start()

    await transport.emit('user.created', { id: '1' })
    expect(received).toEqual([{ id: '1' }])
    await server.stop()
  })

  test('unknown pattern returns 404 error for requests', async () => {
    const transport = new InMemoryTransport()

    class EmptyHandler {}
    const server = new MicroserviceServer(transport, [
      [new EmptyHandler(), EmptyHandler],
    ])
    await server.start()

    // Access the listen handler directly to test error routing
    const internalTransport = transport as unknown as {
      handler: ((m: unknown) => Promise<unknown>) | null
    }
    const res = await internalTransport.handler?.({
      pattern: 'does.not.exist',
      data: null,
      correlationId: 'test-cid',
    })
    expect((res as { error: { status: number } }).error.status).toBe(404)
    await server.stop()
  })

  test('handler error returns serialised error response', async () => {
    const transport = new InMemoryTransport()

    class BadHandler {
      @MessagePattern('explode')
      doIt(_: unknown) {
        throw Object.assign(new Error('boom'), { status: 500 })
      }
    }

    const instance = new BadHandler()
    const server = new MicroserviceServer(transport, [[instance, BadHandler]])
    await server.start()

    const res = await transport.send('explode', null)
    expect(res.error?.message).toBe('boom')
    await server.stop()
  })
})
