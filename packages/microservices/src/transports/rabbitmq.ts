import type { MicroserviceMessage, MicroserviceResponse, Transport } from '../types'

/** Options accepted by {@link rabbitMqTransport}. */
export interface RabbitMqTransportOptions {
  /**
   * AMQP broker URL.
   *
   * @example 'amqp://localhost'
   */
  url?: string
  /**
   * Name of the RabbitMQ queue to consume from / publish to.
   * Defaults to `'banhmi_ms'`.
   */
  queue?: string
}

/**
 * RabbitMQ (AMQP) transport for `@banhmi/microservices`.
 *
 * Requires the `amqplib` package as a peer dependency:
 * ```
 * bun add amqplib
 * ```
 *
 * @example
 * const transport = rabbitMqTransport({ url: 'amqp://localhost', queue: 'cats' })
 * MicroserviceModule.forRoot({ transport })
 */
export class RabbitMqTransport implements Transport {
  private readonly url: string
  private readonly queue: string
  private connection: unknown = null
  private channel: unknown = null

  constructor(opts: RabbitMqTransportOptions = {}) {
    this.url = opts.url ?? 'amqp://localhost'
    this.queue = opts.queue ?? 'banhmi_ms'
  }

  private loadAmqplib(): typeof import('amqplib') {
    try {
      return require('amqplib') as typeof import('amqplib')
    } catch {
      throw new Error(
        '[RabbitMqTransport] amqplib is a required peer dependency. ' +
          'Install it with: bun add amqplib',
      )
    }
  }

  async listen(
    handler: (
      msg: MicroserviceMessage,
    ) => Promise<MicroserviceResponse | undefined>,
  ): Promise<void> {
    const amqp = this.loadAmqplib()
    const conn = await amqp.connect(this.url)
    const ch = await (conn as { createChannel(): Promise<unknown> }).createChannel()
    this.connection = conn
    this.channel = ch

    const channel = ch as {
      assertQueue(name: string, opts?: { durable?: boolean }): Promise<unknown>
      consume(
        name: string,
        cb: (msg: unknown) => void,
        opts?: { noAck?: boolean },
      ): Promise<unknown>
      sendToQueue(name: string, content: Buffer, opts?: { correlationId?: string; replyTo?: string }): void
      ack(msg: unknown): void
    }

    await channel.assertQueue(this.queue, { durable: false })
    await channel.consume(
      this.queue,
      (rawMsg: unknown) => {
        if (!rawMsg) return
        const m = rawMsg as { content: Buffer; properties: { correlationId?: string; replyTo?: string } }
        let inbound: MicroserviceMessage
        try {
          inbound = JSON.parse(m.content.toString('utf8')) as MicroserviceMessage
        } catch {
          return
        }
        const { correlationId, replyTo } = m.properties

        handler(inbound)
          .then((response) => {
            channel.ack(rawMsg)
            if (response !== undefined && correlationId && replyTo) {
              channel.sendToQueue(
                replyTo,
                Buffer.from(JSON.stringify(response)),
                { correlationId },
              )
            }
          })
          .catch(() => {
            channel.ack(rawMsg)
            if (correlationId && replyTo) {
              channel.sendToQueue(
                replyTo,
                Buffer.from(
                  JSON.stringify({
                    error: { message: 'Internal server error', status: 500 },
                  }),
                ),
                { correlationId },
              )
            }
          })
      },
      { noAck: false },
    )
  }

  async close(): Promise<void> {
    if (this.channel) {
      const ch = this.channel as { close(): Promise<void> }
      await ch.close()
      this.channel = null
    }
    if (this.connection) {
      const conn = this.connection as { close(): Promise<void> }
      await conn.close()
      this.connection = null
    }
  }

  async send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>> {
    const amqp = this.loadAmqplib()
    const conn = await amqp.connect(this.url)
    const ch = await (conn as { createChannel(): Promise<unknown> }).createChannel()
    const channel = ch as {
      assertQueue(name: string, opts?: { durable?: boolean; exclusive?: boolean; autoDelete?: boolean }): Promise<{ queue: string }>
      consume(name: string, cb: (msg: unknown) => void, opts?: { noAck?: boolean }): Promise<unknown>
      sendToQueue(name: string, content: Buffer, opts?: { correlationId?: string; replyTo?: string }): void
      close(): Promise<void>
    }

    const correlationId = crypto.randomUUID()
    const replyQueue = await channel.assertQueue('', { exclusive: true, autoDelete: true })

    try {
      return await new Promise<MicroserviceResponse<T>>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`[RabbitMqTransport] send timed out for pattern "${pattern}"`))
        }, 30_000)

        channel.consume(
          replyQueue.queue,
          (msg: unknown) => {
            if (!msg) return
            const m = msg as { properties: { correlationId?: string }; content: Buffer }
            if (m.properties.correlationId !== correlationId) return
            clearTimeout(timeoutId)
            try {
              resolve(JSON.parse(m.content.toString('utf8')) as MicroserviceResponse<T>)
            } catch {
              reject(new Error('[RabbitMqTransport] Failed to parse reply'))
            }
          },
          { noAck: true },
        )

        const envelope: MicroserviceMessage = { pattern, data, correlationId }
        channel.sendToQueue(
          this.queue,
          Buffer.from(JSON.stringify(envelope)),
          { correlationId, replyTo: replyQueue.queue },
        )
      })
    } finally {
      await channel.close()
      const c = conn as { close(): Promise<void> }
      await c.close()
    }
  }

  async emit(pattern: string, data: unknown): Promise<void> {
    const amqp = this.loadAmqplib()
    const conn = await amqp.connect(this.url)
    const ch = await (conn as { createChannel(): Promise<unknown> }).createChannel()
    const channel = ch as {
      assertQueue(name: string, opts?: { durable?: boolean }): Promise<unknown>
      sendToQueue(name: string, content: Buffer): void
      close(): Promise<void>
    }

    try {
      await channel.assertQueue(this.queue, { durable: false })
      const envelope: MicroserviceMessage = { pattern, data }
      channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(envelope)))
    } finally {
      await channel.close()
      const c = conn as { close(): Promise<void> }
      await c.close()
    }
  }
}

/**
 * Create a RabbitMQ (AMQP) transport instance.
 *
 * Requires `amqplib` to be installed as a peer dependency.
 *
 * @param opts - {@link RabbitMqTransportOptions}
 * @returns A new {@link RabbitMqTransport}.
 *
 * @example
 * const transport = rabbitMqTransport({ url: 'amqp://localhost', queue: 'cats' })
 */
export function rabbitMqTransport(
  opts?: RabbitMqTransportOptions,
): RabbitMqTransport {
  return new RabbitMqTransport(opts)
}
