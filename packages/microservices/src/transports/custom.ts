import type {
  MicroserviceMessage,
  MicroserviceResponse,
  Transport,
} from '../types'

/** The strategy object provided to {@link customTransport}. */
export interface CustomTransportStrategy {
  /**
   * Start accepting inbound messages.
   *
   * @param handler - Called for every inbound message. Return `undefined` for
   *   fire-and-forget event handlers; return a {@link MicroserviceResponse}
   *   for request/reply handlers.
   */
  listen(
    handler: (
      msg: MicroserviceMessage,
    ) => Promise<MicroserviceResponse | undefined>,
  ): Promise<void>

  /** Stop accepting messages and release resources. */
  close(): Promise<void>

  /**
   * Send a request and await the reply.
   *
   * @param pattern - The message pattern.
   * @param data - The payload.
   */
  send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>>

  /**
   * Emit a fire-and-forget event.
   *
   * @param pattern - The event pattern.
   * @param data - The payload.
   */
  emit(pattern: string, data: unknown): Promise<void>
}

/**
 * Wraps a custom transport strategy into the standard {@link Transport}
 * interface consumed by `MicroserviceModule`.
 *
 * @param strategy - Object implementing {@link CustomTransportStrategy}.
 * @returns A `Transport` wrapping the provided strategy.
 *
 * @example
 * const transport = customTransport({
 *   async listen(handler) { ... },
 *   async close() { ... },
 *   async send(pattern, data) { return { data: null } },
 *   async emit(_pattern, _data) {},
 * })
 * MicroserviceModule.forRoot({ transport })
 */
export function customTransport(strategy: CustomTransportStrategy): Transport {
  return {
    listen: (handler) => strategy.listen(handler),
    close: () => strategy.close(),
    send: <T>(pattern: string, data: unknown) =>
      strategy.send<T>(pattern, data),
    emit: (pattern, data) => strategy.emit(pattern, data),
  }
}

/**
 * In-memory transport for testing and deterministic integration tests.
 *
 * The same instance acts as both server and client.  Calling `send` / `emit`
 * on the instance routes the message through the `listen` handler
 * synchronously within the same process.
 *
 * @example
 * const transport = new InMemoryTransport()
 * await transport.listen(async (msg) => ({ data: `echo:${String(msg.data)}` }))
 * const res = await transport.send('ping', 'hello')
 * // res.data === 'echo:hello'
 */
export class InMemoryTransport implements Transport {
  private handler:
    | ((msg: MicroserviceMessage) => Promise<MicroserviceResponse | undefined>)
    | null = null

  async listen(
    handler: (
      msg: MicroserviceMessage,
    ) => Promise<MicroserviceResponse | undefined>,
  ): Promise<void> {
    this.handler = handler
  }

  async close(): Promise<void> {
    this.handler = null
  }

  async send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>> {
    if (!this.handler) {
      throw new Error('[InMemoryTransport] Transport not listening')
    }
    const msg: MicroserviceMessage = {
      pattern,
      data,
      correlationId: crypto.randomUUID(),
    }
    const response = await this.handler(msg)
    return (response ?? { data: undefined }) as MicroserviceResponse<T>
  }

  async emit(pattern: string, data: unknown): Promise<void> {
    if (!this.handler) return
    const msg: MicroserviceMessage = { pattern, data }
    await this.handler(msg)
  }
}
