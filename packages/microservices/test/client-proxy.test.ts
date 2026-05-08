import { describe, expect, test } from 'bun:test'
import { ClientProxy } from '../src/client/client-proxy'
import { InMemoryTransport } from '../src/transports/custom'
import { MessagePattern } from '../src/decorators/message-pattern'
import { EventPattern } from '../src/decorators/event-pattern'
import { MicroserviceServer } from '../src/server/server'

describe('ClientProxy', () => {
  test('send returns resolved data', async () => {
    const transport = new InMemoryTransport()
    const proxy = new ClientProxy(transport)
    await transport.listen(async (msg) => ({ data: `pong:${String(msg.data)}` }))

    const result = await proxy.send<string>('ping', 'hello')
    expect(result).toBe('pong:hello')
    await proxy.close()
  })

  test('send rejects on error response', async () => {
    const transport = new InMemoryTransport()
    const proxy = new ClientProxy(transport)
    await transport.listen(async () => ({
      error: { message: 'Not found', status: 404 },
    }))

    await expect(proxy.send('missing', null)).rejects.toThrow('Not found')
    await proxy.close()
  })

  test('send times out after specified ms', async () => {
    const transport = new InMemoryTransport()
    const proxy = new ClientProxy(transport)

    // Listener that never resolves
    await transport.listen(() => new Promise(() => {}))

    const start = Date.now()
    await expect(proxy.send('slow', null, 50)).rejects.toThrow('timed out')
    expect(Date.now() - start).toBeGreaterThanOrEqual(40)
    await proxy.close()
  }, 3000)

  test('emit is fire-and-forget', async () => {
    const transport = new InMemoryTransport()
    const proxy = new ClientProxy(transport)
    const emitted: unknown[] = []

    await transport.listen(async (msg) => {
      emitted.push(msg)
      return undefined
    })

    await proxy.emit('user.created', { id: '1' })
    expect(emitted).toHaveLength(1)
    expect((emitted[0] as { pattern: string }).pattern).toBe('user.created')
    await proxy.close()
  })

  test('send works end-to-end through MicroserviceServer', async () => {
    const transport = new InMemoryTransport()
    const proxy = new ClientProxy(transport)

    class CatsService {
      @MessagePattern('cats.find')
      find(id: string) {
        return { id, name: 'Tom' }
      }
    }

    const server = new MicroserviceServer(transport, [
      [new CatsService(), CatsService],
    ])
    await server.start()

    const cat = await proxy.send<{ id: string; name: string }>('cats.find', '99')
    expect(cat).toEqual({ id: '99', name: 'Tom' })

    await proxy.close()
    await server.stop()
  })

  test('emit works end-to-end through MicroserviceServer', async () => {
    const transport = new InMemoryTransport()
    const proxy = new ClientProxy(transport)
    const events: unknown[] = []

    class UserListener {
      @EventPattern('user.deleted')
      onDeleted(data: unknown) {
        events.push(data)
      }
    }

    const server = new MicroserviceServer(transport, [
      [new UserListener(), UserListener],
    ])
    await server.start()

    await proxy.emit('user.deleted', { id: '5' })
    expect(events).toEqual([{ id: '5' }])

    await proxy.close()
    await server.stop()
  })
})
