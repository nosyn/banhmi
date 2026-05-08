import type { MicroserviceMessage, MicroserviceResponse, Transport } from '../types'

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
 * Uses `ioredis` as a peer dependency.  Two Redis connections are created: one
 * for subscribing (inbound) and one for publishing (outbound).
 *
 * Pattern channels are prefixed by `options.prefix` (default `'banhmi_ms'`).
 * Reply channels use the format `{prefix}:reply:{correlationId}`.
 *
 * @example
 * const transport = redisTransport({ url: 'redis://localhost:6379' })
 * MicroserviceModule.forRoot({ transport })
 */
export class RedisTransport implements Transport {
  private readonly url: string
  private readonly prefix: string
  private subClient: import('ioredis').Redis | null = null
  private pubClient: import('ioredis').Redis | null = null

  constructor(opts: RedisTransportOptions = {}) {
    this.url = opts.url ?? 'redis://localhost:6379'
    this.prefix = opts.prefix ?? 'banhmi_ms'
  }

  private channel(pattern: string): string {
    return `${this.prefix}:${pattern}`
  }

  private replyChannel(correlationId: string): string {
    return `${this.prefix}:reply:${correlationId}`
  }

  private loadIORedis(): typeof import('ioredis').default {
    try {
      // biome-ignore lint/performance/noBarrelFile: dynamic peer dep
      return require('ioredis')
    } catch {
      throw new Error(
        '[RedisTransport] ioredis is a required peer dependency. ' +
          'Install it with: bun add ioredis',
      )
    }
  }

  async listen(handler: InboundHandler): Promise<void> {
    const IORedis = this.loadIORedis()
    this.subClient = new IORedis(this.url)
    this.pubClient = new IORedis(this.url)

    const subClient = this.subClient
    const pubClient = this.pubClient
    const prefix = this.prefix

    // Subscribe to all microservice channels using a pattern
    await subClient.psubscribe(`${prefix}:*`)

    subClient.on(
      'pmessage',
      (_pattern: string, channel: string, rawMsg: string) => {
        // Skip reply channels
        if (channel.startsWith(`${prefix}:reply:`)) return

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
      },
    )
  }

  async close(): Promise<void> {
    if (this.subClient) {
      await this.subClient.quit()
      this.subClient = null
    }
    if (this.pubClient) {
      await this.pubClient.quit()
      this.pubClient = null
    }
  }

  async send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>> {
    const IORedis = this.loadIORedis()
    const correlationId = crypto.randomUUID()
    const channel = this.channel(pattern)
    const replyChannel = this.replyChannel(correlationId)

    const pubClient = this.pubClient ?? new IORedis(this.url)
    const needsOwnPub = this.pubClient === null
    const tempSub = new IORedis(this.url)

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

          tempSub.subscribe(replyChannel, (err) => {
            if (err) {
              clearTimeout(timeoutId)
              reject(err)
              return
            }

            const msg: MicroserviceMessage = {
              pattern,
              data,
              correlationId,
            }
            pubClient.publish(channel, JSON.stringify(msg))
          })

          tempSub.on('message', (_ch: string, raw: string) => {
            clearTimeout(timeoutId)
            try {
              const res = JSON.parse(raw) as MicroserviceResponse<T>
              resolve(res)
            } catch {
              reject(new Error('[RedisTransport] Failed to parse reply'))
            }
          })
        },
      )

      return response
    } finally {
      await tempSub.quit()
      if (needsOwnPub) await pubClient.quit()
    }
  }

  async emit(pattern: string, data: unknown): Promise<void> {
    const IORedis = this.loadIORedis()
    const pubClient = this.pubClient ?? new IORedis(this.url)
    const needsOwnPub = this.pubClient === null

    const msg: MicroserviceMessage = { pattern, data }
    try {
      await pubClient.publish(this.channel(pattern), JSON.stringify(msg))
    } finally {
      if (needsOwnPub) await pubClient.quit()
    }
  }
}

/**
 * Create a Redis pub/sub transport instance.
 *
 * Requires `ioredis` to be installed as a peer dependency.
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
