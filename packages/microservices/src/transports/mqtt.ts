import type {
  MicroserviceMessage,
  MicroserviceResponse,
  Transport,
} from '../types'

/** Options accepted by {@link mqttTransport}. */
export interface MqttTransportOptions {
  /**
   * MQTT broker URL.
   *
   * @example 'mqtt://localhost:1883'
   */
  url?: string
  /**
   * Topic prefix applied to all patterns.
   * Defaults to `'banhmi_ms'`.
   */
  prefix?: string
}

/**
 * MQTT transport for `@banhmi/microservices`.
 *
 * Requires the `mqtt` package as a peer dependency:
 * ```
 * bun add mqtt
 * ```
 *
 * @example
 * const transport = mqttTransport({ url: 'mqtt://localhost:1883' })
 * MicroserviceModule.forRoot({ transport })
 */
export class MqttTransport implements Transport {
  private readonly url: string
  private readonly prefix: string
  private client: unknown = null

  constructor(opts: MqttTransportOptions = {}) {
    this.url = opts.url ?? 'mqtt://localhost:1883'
    this.prefix = opts.prefix ?? 'banhmi_ms'
  }

  private loadMqtt(): typeof import('mqtt') {
    try {
      return require('mqtt') as typeof import('mqtt')
    } catch {
      throw new Error(
        '[MqttTransport] mqtt is a required peer dependency. ' +
          'Install it with: bun add mqtt',
      )
    }
  }

  async listen(
    handler: (
      msg: MicroserviceMessage,
    ) => Promise<MicroserviceResponse | undefined>,
  ): Promise<void> {
    const mqtt = this.loadMqtt()
    const client = mqtt.connect(this.url)
    this.client = client
    const prefix = this.prefix

    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve)
      client.once('error', reject)
    })

    client.subscribe(`${prefix}/+`)
    client.on('message', (topic: string, payload: Buffer) => {
      let inbound: MicroserviceMessage
      try {
        inbound = JSON.parse(payload.toString('utf8')) as MicroserviceMessage
      } catch {
        return
      }

      // Skip reply topics
      if (topic.startsWith(`${prefix}/reply/`)) return

      handler(inbound)
        .then((response) => {
          if (response !== undefined && inbound.correlationId) {
            client.publish(
              `${prefix}/reply/${inbound.correlationId}`,
              JSON.stringify(response),
            )
          }
        })
        .catch(() => {
          if (inbound.correlationId) {
            client.publish(
              `${prefix}/reply/${inbound.correlationId}`,
              JSON.stringify({
                error: { message: 'Internal server error', status: 500 },
              }),
            )
          }
        })
    })
  }

  async close(): Promise<void> {
    if (this.client) {
      const c = this.client as { end(): void }
      c.end()
      this.client = null
    }
  }

  async send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>> {
    const mqtt = this.loadMqtt()
    const client = mqtt.connect(this.url)
    const prefix = this.prefix
    const correlationId = crypto.randomUUID()

    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve)
      client.once('error', reject)
    })

    const replyTopic = `${prefix}/reply/${correlationId}`
    client.subscribe(replyTopic)

    const msg: MicroserviceMessage = { pattern, data, correlationId }

    try {
      return await new Promise<MicroserviceResponse<T>>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(
            new Error(
              `[MqttTransport] send timed out for pattern "${pattern}"`,
            ),
          )
        }, 30_000)

        client.on('message', (topic: string, payload: Buffer) => {
          if (topic !== replyTopic) return
          clearTimeout(timeoutId)
          try {
            resolve(
              JSON.parse(payload.toString('utf8')) as MicroserviceResponse<T>,
            )
          } catch {
            reject(new Error('[MqttTransport] Failed to parse reply'))
          }
        })

        client.publish(`${prefix}/${pattern}`, JSON.stringify(msg))
      })
    } finally {
      client.end()
    }
  }

  async emit(pattern: string, data: unknown): Promise<void> {
    const mqtt = this.loadMqtt()
    const client = mqtt.connect(this.url)

    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve)
      client.once('error', reject)
    })

    const msg: MicroserviceMessage = { pattern, data }
    await new Promise<void>((resolve, reject) => {
      client.publish(
        `${this.prefix}/${pattern}`,
        JSON.stringify(msg),
        (err) => {
          if (err) reject(err)
          else resolve()
        },
      )
    })

    client.end()
  }
}

/**
 * Create an MQTT transport instance.
 *
 * Requires `mqtt` to be installed as a peer dependency.
 *
 * @param opts - {@link MqttTransportOptions}
 * @returns A new {@link MqttTransport}.
 *
 * @example
 * const transport = mqttTransport({ url: 'mqtt://localhost:1883' })
 */
export function mqttTransport(opts?: MqttTransportOptions): MqttTransport {
  return new MqttTransport(opts)
}
