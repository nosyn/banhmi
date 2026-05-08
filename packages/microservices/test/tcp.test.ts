import { describe, expect, test } from 'bun:test'
import { MessagePattern } from '../src/decorators/message-pattern'
import { EventPattern } from '../src/decorators/event-pattern'
import { MicroserviceServer } from '../src/server/server'
import { ClientProxy } from '../src/client/client-proxy'
import { tcpTransport } from '../src/transports/tcp'

/** Resolve a free TCP port by binding to :0 and reading the assigned port. */
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = Bun.listen({
      hostname: '127.0.0.1',
      port: 0,
      socket: {
        open() {},
        data() {},
        error(_s: unknown, e: Error) {
          reject(e)
        },
        close() {},
      },
    })
    const port = server.port
    server.stop(true)
    resolve(port)
  })
}

describe('TCP transport — integration', () => {
  test('MessagePattern: client sends, server responds', async () => {
    const port = await getFreePort()
    const serverTransport = tcpTransport({ port })
    const clientTransport = tcpTransport({ port })

    class CatsHandler {
      @MessagePattern('cats.find')
      find(id: string) {
        return { id, name: 'Tom' }
      }
    }

    const server = new MicroserviceServer(serverTransport, [
      [new CatsHandler(), CatsHandler],
    ])
    await server.start()

    // Give the server a tick to start listening
    await new Promise((r) => setTimeout(r, 20))

    const proxy = new ClientProxy(clientTransport)
    const cat = await proxy.send<{ id: string; name: string }>('cats.find', '1')

    expect(cat).toEqual({ id: '1', name: 'Tom' })

    await proxy.close()
    await server.stop()
  }, 5000)

  test('EventPattern: client emits, server handler runs', async () => {
    const port = await getFreePort()
    const serverTransport = tcpTransport({ port })
    const clientTransport = tcpTransport({ port })
    const received: unknown[] = []

    class UserListener {
      @EventPattern('user.created')
      onCreated(data: unknown) {
        received.push(data)
      }
    }

    const server = new MicroserviceServer(serverTransport, [
      [new UserListener(), UserListener],
    ])
    await server.start()
    await new Promise((r) => setTimeout(r, 20))

    const proxy = new ClientProxy(clientTransport)
    await proxy.emit('user.created', { id: '5', email: 'test@example.com' })

    // Give handler time to run
    await new Promise((r) => setTimeout(r, 50))

    expect(received).toEqual([{ id: '5', email: 'test@example.com' }])

    await proxy.close()
    await server.stop()
  }, 5000)

  test('handler error is serialised and returned to client', async () => {
    const port = await getFreePort()
    const serverTransport = tcpTransport({ port })
    const clientTransport = tcpTransport({ port })

    class BadHandler {
      @MessagePattern('throw')
      doThrow(_: unknown) {
        throw Object.assign(new Error('handler exploded'), { status: 500 })
      }
    }

    const server = new MicroserviceServer(serverTransport, [
      [new BadHandler(), BadHandler],
    ])
    await server.start()
    await new Promise((r) => setTimeout(r, 20))

    const proxy = new ClientProxy(clientTransport)
    await expect(proxy.send('throw', null)).rejects.toThrow('handler exploded')

    await proxy.close()
    await server.stop()
  }, 5000)
})
