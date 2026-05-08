/**
 * ms-app — microservice subscriber.
 *
 * Starts a TCP microservice server on `MS_PORT` (default 3001) and registers
 * the {@link CatsHandler} for `cats.findOne`, `cats.findAll`, and
 * `user.created` patterns.
 *
 * @example
 * MS_PORT=3001 bun run src/main.ts
 */

import '../../../../packages/common/src/polyfill-symbol-metadata'
import { MicroserviceServer, tcpTransport } from '@banhmi/microservices'
import { CatsHandler } from './cats.handler'

const port = Number(Bun.env.MS_PORT ?? 3001)

const transport = tcpTransport({ port })
const handler = new CatsHandler()

const server = new MicroserviceServer(transport, [[handler, CatsHandler]])

await server.start()
console.log(`[ms-app] Listening on TCP port ${port}`)

process.on('SIGTERM', async () => {
  await server.stop()
  process.exit(0)
})
