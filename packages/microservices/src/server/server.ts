import type { ClassConstructor } from '@banhmi/common'
import { MicroserviceExplorer } from '../explorer'
import type {
  MicroserviceMessage,
  MicroserviceResponse,
  Transport,
} from '../types'

/**
 * The microservice server wires together the transport layer and the handler
 * explorer.
 *
 * It calls `transport.listen()` with a dispatch function that routes inbound
 * messages to the correct `@MessagePattern` / `@EventPattern` handler.
 *
 * @example
 * const server = new MicroserviceServer(transport, [[serviceInstance, ServiceClass]])
 * await server.start()
 * // ...
 * await server.stop()
 */
export class MicroserviceServer {
  private readonly explorer = new MicroserviceExplorer()

  constructor(
    private readonly transport: Transport,
    private readonly pairs: Array<[object, ClassConstructor]>,
  ) {}

  /**
   * Discover handlers and start the transport.
   *
   * @example
   * await server.start()
   */
  async start(): Promise<void> {
    const registrations = this.explorer.explore(this.pairs)

    // Build a fast lookup map pattern → handler
    const handlerMap = new Map<
      string,
      (msg: MicroserviceMessage) => Promise<MicroserviceResponse | undefined>
    >()

    for (const reg of registrations) {
      handlerMap.set(reg.pattern, reg.invoke.bind(reg))
    }

    await this.transport.listen(async (msg: MicroserviceMessage) => {
      const handler = handlerMap.get(msg.pattern)
      if (!handler) {
        // No handler for this pattern — return an error for requests
        if (msg.correlationId) {
          return {
            error: {
              message: `No handler registered for pattern "${msg.pattern}"`,
              status: 404,
            },
          }
        }
        return undefined
      }
      return handler(msg)
    })
  }

  /**
   * Stop the transport.
   *
   * @example
   * await server.stop()
   */
  async stop(): Promise<void> {
    await this.transport.close()
  }
}
