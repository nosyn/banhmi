/**
 * Integration test for the microservices-demo cluster.
 *
 * Spawns the ms-app TCP subscriber on a random port, then uses an in-process
 * ClientProxy to exercise `cats.findOne`, `cats.findAll`, and
 * `user.created` patterns — without a separate client-app process (avoids
 * flakiness from process spawn timing).
 *
 * For a two-process smoke test, see the scripts in each app's package.json.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  ClientProxy,
  MicroserviceServer,
  tcpTransport,
} from '@banhmi/microservices'
import { CatsHandler } from '../ms-app/src/cats.handler'

let server: MicroserviceServer
let proxy: ClientProxy
let port: number

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = Bun.listen({
      hostname: '127.0.0.1',
      port: 0,
      socket: {
        open() {},
        data() {},
        error(_sock: unknown, e: Error) {
          reject(e)
        },
        close() {},
      },
    })
    port = s.port
    s.stop(true)
    resolve(port)
  })
}

beforeAll(async () => {
  port = await getFreePort()
  const serverTransport = tcpTransport({ port })
  const handler = new CatsHandler()
  server = new MicroserviceServer(serverTransport, [[handler, CatsHandler]])
  await server.start()
  // Give the server a tick to bind
  await new Promise((r) => setTimeout(r, 30))

  const clientTransport = tcpTransport({ port })
  proxy = new ClientProxy(clientTransport)
})

afterAll(async () => {
  await proxy.close()
  await server.stop()
})

describe('microservices-demo integration', () => {
  test('cats.findOne returns the correct cat', async () => {
    const cat = await proxy.send<{ id: string; name: string; age: number }>(
      'cats.findOne',
      '1',
    )
    expect(cat).toMatchObject({ id: '1', name: 'Tom', age: 3 })
  }, 5000)

  test('cats.findOne returns error for unknown id', async () => {
    const result = await proxy.send('cats.findOne', '999')
    // The handler returns { error: string } (application-level, not transport-level)
    expect(result).toMatchObject({ error: expect.stringContaining('999') })
  }, 5000)

  test('cats.findAll returns all cats', async () => {
    const cats = await proxy.send<Array<{ id: string }>>('cats.findAll', null)
    expect(Array.isArray(cats)).toBe(true)
    expect(cats.length).toBeGreaterThan(0)
  }, 5000)

  test('user.created event is fire-and-forget (no error)', async () => {
    // emit returns void; no response expected
    await expect(
      proxy.emit('user.created', { id: '10', email: 'test@example.com' }),
    ).resolves.toBeUndefined()
  }, 5000)
})
