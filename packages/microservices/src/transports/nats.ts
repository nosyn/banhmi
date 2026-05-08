import type {
  MicroserviceMessage,
  MicroserviceResponse,
  Transport,
} from '../types'

/** Options accepted by {@link natsTransport}. */
export interface NatsTransportOptions {
  /**
   * NATS server URL.
   *
   * @example 'nats://localhost:4222'
   */
  servers?: string | string[]
  /**
   * Subject prefix applied to all patterns.
   * Defaults to `'banhmi_ms'`.
   */
  prefix?: string
}

/**
 * NATS transport for `@banhmi/microservices`.
 *
 * Requires the `nats` package as a peer dependency:
 * ```
 * bun add nats
 * ```
 *
 * @example
 * const transport = natsTransport({ servers: 'nats://localhost:4222' })
 * MicroserviceModule.forRoot({ transport })
 */
export class NatsTransport implements Transport {
  private readonly opts: NatsTransportOptions
  private connection: unknown = null

  constructor(opts: NatsTransportOptions = {}) {
    this.opts = opts
  }

  private loadNats(): typeof import('nats') {
    try {
      return require('nats') as typeof import('nats')
    } catch {
      throw new Error(
        '[NatsTransport] nats is a required peer dependency. ' +
          'Install it with: bun add nats',
      )
    }
  }

  async listen(
    handler: (
      msg: MicroserviceMessage,
    ) => Promise<MicroserviceResponse | undefined>,
  ): Promise<void> {
    const nats = this.loadNats()
    const prefix = this.opts.prefix ?? 'banhmi_ms'
    const nc = await nats.connect({
      servers: this.opts.servers ?? 'nats://localhost:4222',
    })
    this.connection = nc

    const sc = nats.StringCodec()

    // Subscribe to all pattern subjects under the prefix
    const sub = nc.subscribe(`${prefix}.>`)
    void (async () => {
      for await (const m of sub) {
        let inbound: MicroserviceMessage
        try {
          inbound = JSON.parse(sc.decode(m.data)) as MicroserviceMessage
        } catch {
          continue
        }

        handler(inbound)
          .then((response) => {
            if (response !== undefined && m.reply) {
              m.respond(sc.encode(JSON.stringify(response)))
            }
          })
          .catch(() => {
            if (m.reply) {
              m.respond(
                sc.encode(
                  JSON.stringify({
                    error: { message: 'Internal server error', status: 500 },
                  }),
                ),
              )
            }
          })
      }
    })()
  }

  async close(): Promise<void> {
    if (this.connection) {
      const nc = this.connection as { drain(): Promise<void> }
      await nc.drain()
      this.connection = null
    }
  }

  async send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>> {
    const nats = this.loadNats()
    const prefix = this.opts.prefix ?? 'banhmi_ms'
    const nc = await nats.connect({
      servers: this.opts.servers ?? 'nats://localhost:4222',
    })
    const sc = nats.StringCodec()

    try {
      const msg: MicroserviceMessage = {
        pattern,
        data,
        correlationId: crypto.randomUUID(),
      }
      const reply = await nc.request(
        `${prefix}.${pattern}`,
        sc.encode(JSON.stringify(msg)),
        { timeout: 30_000 },
      )
      return JSON.parse(sc.decode(reply.data)) as MicroserviceResponse<T>
    } finally {
      await nc.drain()
    }
  }

  async emit(pattern: string, data: unknown): Promise<void> {
    const nats = this.loadNats()
    const prefix = this.opts.prefix ?? 'banhmi_ms'
    const nc = await nats.connect({
      servers: this.opts.servers ?? 'nats://localhost:4222',
    })
    const sc = nats.StringCodec()

    try {
      const msg: MicroserviceMessage = { pattern, data }
      nc.publish(`${prefix}.${pattern}`, sc.encode(JSON.stringify(msg)))
    } finally {
      await nc.drain()
    }
  }
}

/**
 * Create a NATS transport instance.
 *
 * Requires `nats` to be installed as a peer dependency.
 *
 * @param opts - {@link NatsTransportOptions}
 * @returns A new {@link NatsTransport}.
 *
 * @example
 * const transport = natsTransport({ servers: 'nats://localhost:4222' })
 */
export function natsTransport(opts?: NatsTransportOptions): NatsTransport {
  return new NatsTransport(opts)
}
