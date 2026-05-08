/**
 * client-app — microservice producer.
 *
 * Connects to the TCP microservice on `MS_PORT` (default 3001), sends a
 * `cats.findOne` request, and emits a `user.created` event.
 *
 * @example
 * MS_PORT=3001 bun run src/main.ts
 */

import '../../../../packages/common/src/polyfill-symbol-metadata'
import { ClientProxy, tcpTransport } from '@banhmi/microservices'

const port = Number(Bun.env.MS_PORT ?? 3001)
const transport = tcpTransport({ port })
const client = new ClientProxy(transport)

// Send a request/reply message
const cat = await client.send<{ id: string; name: string; age: number }>(
  'cats.findOne',
  '1',
)
console.log('[client-app] cats.findOne response:', JSON.stringify(cat))

// Emit a fire-and-forget event
await client.emit('user.created', { id: '42', email: 'alice@example.com' })
console.log('[client-app] user.created event emitted')

await client.close()
