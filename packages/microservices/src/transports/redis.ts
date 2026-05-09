import type {
  MicroserviceMessage,
  MicroserviceResponse,
  Transport,
} from '../types'

/** Options accepted by {@link redisTransport}. */
export interface RedisTransportOptions {
  /**
   * Redis connection URL.
   *
   * @example 'redis://localhost:6379'
   */
  url?: string
  /**
   * Channel prefix applied to all patterns.
   * Defaults to `'banhmi_ms'`.
   */
  prefix?: string
}

type InboundHandler = (
  msg: MicroserviceMessage,
) => Promise<MicroserviceResponse | undefined>

/**
 * Redis pub/sub transport for `@banhmi/microservices`.
 *
 * Uses `Bun.RedisClient` (built-in — no extra dependency). Two Redis
 * connections are created: one for subscribing (inbound) and one for
 * publishing (outbound).
 *
 * **Wire protocol:**
 * All inbound messages are published to a single channel:
 * `${prefix}:inbound`. This replaces the previous `psubscribe('prefix:*')`
 * approach because `Bun.RedisClient.subscribe` delivers messages via a
 * callback (exact channels only) while `psubscribe` lacks a callback
 * delivery mechanism in Bun 1.3.x.
 *
 * Reply channels still use the format `{prefix}:reply:{correlationId}`.
 *
 * @example
 * const transport = redisTransport({ url: 'redis://localhost:6379' })
 * MicroserviceModule.forRoot({ transport })
 */
export class RedisTransport implements Transport {
  private readonly url: string
  private readonly prefix: string
  private subClient: InstanceType<typeof Bun.RedisClient> | null = null
  private pubClient: InstanceType<typeof Bun.RedisClient> | null = null

  constructor(opts: RedisTransportOptions = {}) {
    this.url = opts.url ?? 'redis://localhost:6379'
    this.prefix = opts.prefix ?? 'banhmi_ms'
  }

  private get inboundChannel(): string {
    return `${this.prefix}:inbound`
  }

  private replyChannel(correlationId: string): string {
    return `${this.prefix}:reply:${correlationId}`
  }

  async listen(handler: InboundHandler): Promise<void> {
    this.subClient = new Bun.RedisClient(this.url)
    this.pubClient = new Bun.RedisClient(this.url)

    const pubClient = this.pubClient
    const prefix = this.prefix

    // Subscribe to the single inbound channel.
    // The message envelope's `pattern` field is used for handler dispatch.
    this.subClient.subscribe(this.inboundChannel, (rawMsg: string) => {
      let inbound: MicroserviceMessage
      try {
        inbound = JSON.parse(rawMsg) as MicroserviceMessage
      } catch {
        return
      }

      handler(inbound)
        .then((response) => {
          if (response !== undefined && inbound.correlationId) {
            pubClient.publish(
              `${prefix}:reply:${inbound.correlationId}`,
              JSON.stringify(response),
            )
          }
        })
        .catch(() => {
          if (inbound.correlationId) {
            const errReply = {
              error: { message: 'Internal server error', status: 500 },
            }
            pubClient.publish(
              `${prefix}:reply:${inbound.correlationId}`,
              JSON.stringify(errReply),
            )
          }
        })
    })
  }

  async close(): Promise<void> {
    if (this.subClient) {
      this.subClient.close()
      this.subClient = null
    }
    if (this.pubClient) {
      this.pubClient.close()
      this.pubClient = null
    }
  }

  async send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>> {
    const correlationId = crypto.randomUUID()
    const replyChannel = this.replyChannel(correlationId)

    const pubClient = this.pubClient ?? new Bun.RedisClient(this.url)
    const needsOwnPub = this.pubClient === null
    const tempSub = new Bun.RedisClient(this.url)

    try {
      const response = await new Promise<MicroserviceResponse<T>>(
        (resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(
              new Error(
                `[RedisTransport] send timed out for pattern "${pattern}"`,
              ),
            )
          }, 30_000)

          // Subscribe to the reply channel first, then publish the request.
          tempSub.subscribe(replyChannel, (raw: string) => {
            clearTimeout(timeoutId)
            try {
              const res = JSON.parse(raw) as MicroserviceResponse<T>
              resolve(res)
            } catch {
              reject(new Error('[RedisTransport] Failed to parse reply'))
            }
          })

          const msg: MicroserviceMessage = {
            pattern,
            data,
            correlationId,
          }
          // Publish to the inbound channel (server is subscribed there).
          pubClient.publish(this.inboundChannel, JSON.stringify(msg))
        },
      )

      return response
    } finally {
      tempSub.close()
      if (needsOwnPub) pubClient.close()
    }
  }

  async emit(pattern: string, data: unknown): Promise<void> {
    const pubClient = this.pubClient ?? new Bun.RedisClient(this.url)
    const needsOwnPub = this.pubClient === null

    const msg: MicroserviceMessage = { pattern, data }
    try {
      await pubClient.publish(this.inboundChannel, JSON.stringify(msg))
    } finally {
      if (needsOwnPub) pubClient.close()
    }
  }
}

/**
 * Create a Redis pub/sub transport instance backed by `Bun.RedisClient`.
 *
 * No extra dependencies required — `Bun.RedisClient` is built in.
 *
 * All messages flow through a single inbound channel (`${prefix}:inbound`).
 * The message envelope's `pattern` field is used for server-side dispatch.
 * Reply channels use the format `${prefix}:reply:{correlationId}`.
 *
 * @param opts - {@link RedisTransportOptions}
 * @returns A new {@link RedisTransport}.
 *
 * @example
 * const transport = redisTransport({ url: 'redis://localhost:6379' })
 * MicroserviceModule.forRoot({ transport })
 */
export function redisTransport(opts?: RedisTransportOptions): RedisTransport {
  return new RedisTransport(opts)
}
