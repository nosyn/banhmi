/**
 * Core types for `@banhmi/microservices`.
 *
 * @module
 */

/**
 * A serialisable message envelope sent over a transport.
 *
 * @example
 * const msg: MicroserviceMessage = { pattern: 'cats.findOne', data: { id: 1 } }
 */
export interface MicroserviceMessage<T = unknown> {
  /** The message or event pattern string. */
  pattern: string
  /** The payload forwarded to the handler. */
  data: T
  /** Optional correlation id for request/reply matching. */
  correlationId?: string
}

/**
 * A serialisable response envelope returned over a transport.
 *
 * @example
 * const res: MicroserviceResponse = { data: { id: 1, name: 'Tom' } }
 */
export interface MicroserviceResponse<T = unknown> {
  /** The result data. Present on success. */
  data?: T
  /** Serialised error. Present on failure. */
  error?: MicroserviceError
}

/**
 * Serialisable error shape returned when a handler throws.
 *
 * @example
 * const err: MicroserviceError = { message: 'Not found', status: 404 }
 */
export interface MicroserviceError {
  /** Human-readable message. */
  message: string
  /** Optional HTTP-like status code. */
  status?: number
  /** Optional machine-readable error code. */
  code?: string
}

/**
 * Configuration passed to `MicroserviceModule.forRoot()`.
 *
 * @example
 * MicroserviceModule.forRoot({ transport: tcpTransport({ port: 3001 }) })
 */
export interface MicroserviceOptions {
  /** The transport instance to use. */
  transport: Transport
}

/**
 * Options accepted by `ClientsModule.register()`.
 *
 * @example
 * ClientsModule.register([{ name: 'CATS_SERVICE', transport: tcpTransport({ host: 'localhost', port: 3001 }) }])
 */
export interface ClientOptions {
  /** DI token name for the registered client. */
  name: string
  /** The transport used for outgoing calls. */
  transport: Transport
}

/**
 * The low-level transport interface every adapter must implement.
 *
 * A transport is responsible for:
 * - `listen` — start accepting inbound messages and routing them to handlers.
 * - `close` — stop accepting connections and release resources.
 * - `send` — make a request and await a response (request/reply).
 * - `emit` — fire-and-forget publish (no response expected).
 *
 * @example
 * class MyTransport implements Transport {
 *   async listen(handler) { ... }
 *   async close() { ... }
 *   async send(pattern, data) { return { data: null } }
 *   async emit(pattern, data) {}
 * }
 */
export interface Transport {
  /**
   * Start the transport server.
   *
   * The `handler` callback is invoked for every inbound request.  For
   * fire-and-forget events the handler may return `undefined`.
   *
   * @param handler - Async function that receives a {@link MicroserviceMessage}
   *   and returns a serialisable response (or `undefined` for events).
   */
  listen(
    handler: (
      msg: MicroserviceMessage,
    ) => Promise<MicroserviceResponse | undefined>,
  ): Promise<void>

  /** Stop the transport and release resources. */
  close(): Promise<void>

  /**
   * Send a request and wait for the reply.
   *
   * @param pattern - The message pattern.
   * @param data - The payload.
   * @returns The response envelope from the handler.
   */
  send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>>

  /**
   * Publish an event with no reply expected.
   *
   * @param pattern - The event pattern.
   * @param data - The payload.
   */
  emit(pattern: string, data: unknown): Promise<void>
}
