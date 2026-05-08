import type {
  MicroserviceMessage,
  MicroserviceResponse,
  Transport,
} from '../types'

/** Options accepted by {@link kafkaTransport}. */
export interface KafkaTransportOptions {
  /**
   * Kafka broker addresses.
   *
   * @example ['localhost:9092']
   */
  brokers?: string[]
  /**
   * Consumer group id.
   * Defaults to `'banhmi-ms'`.
   */
  groupId?: string
  /**
   * Topic prefix applied to all patterns.
   * Defaults to `'banhmi_ms'`.
   */
  prefix?: string
}

/**
 * Kafka transport stub for `@banhmi/microservices`.
 *
 * @remarks
 * **Status: Tier C stub — not fully implemented.**
 *
 * `kafkajs` has known compatibility issues under Bun's native module loader
 * (missing Node.js `fs` polyfills for TLS and admin APIs). A full
 * implementation is deferred until `kafkajs` or an equivalent ships a
 * Bun-native build.
 *
 * A `customTransport()` can be used in the meantime with any Kafka client
 * that runs under Bun.
 *
 * TODO(wave-9): revisit once kafkajs releases Bun-compatible builds.
 *
 * @example
 * // stub usage — throws at runtime
 * const transport = kafkaTransport({ brokers: ['localhost:9092'] })
 */
export class KafkaTransport implements Transport {
  // biome-ignore lint/complexity/noUselessConstructor: intentional stub constructor that accepts options
  constructor(_opts: KafkaTransportOptions = {}) {}

  async listen(
    _handler: (
      msg: MicroserviceMessage,
    ) => Promise<MicroserviceResponse | undefined>,
  ): Promise<void> {
    throw new Error(
      '[KafkaTransport] Not implemented (Tier C stub). ' +
        'kafkajs has Bun compatibility issues. Use customTransport() instead. ' +
        'TODO(wave-9): implement when kafkajs ships a Bun-native build.',
    )
  }

  async close(): Promise<void> {
    // no-op stub
  }

  async send<T = unknown>(
    _pattern: string,
    _data: unknown,
  ): Promise<MicroserviceResponse<T>> {
    throw new Error(
      '[KafkaTransport] Not implemented (Tier C stub). ' +
        'kafkajs has Bun compatibility issues. Use customTransport() instead. ' +
        'TODO(wave-9): implement when kafkajs ships a Bun-native build.',
    )
  }

  async emit(_pattern: string, _data: unknown): Promise<void> {
    throw new Error(
      '[KafkaTransport] Not implemented (Tier C stub). ' +
        'kafkajs has Bun compatibility issues. Use customTransport() instead. ' +
        'TODO(wave-9): implement when kafkajs ships a Bun-native build.',
    )
  }
}

/**
 * Create a Kafka transport stub.
 *
 * @remarks **Tier C stub — throws at runtime. See {@link KafkaTransport} docs.**
 *
 * @param opts - {@link KafkaTransportOptions}
 * @returns A new {@link KafkaTransport} stub.
 *
 * @example
 * // TODO(wave-9): use once kafkajs is Bun-compatible
 * const transport = kafkaTransport({ brokers: ['localhost:9092'] })
 */
export function kafkaTransport(opts?: KafkaTransportOptions): KafkaTransport {
  return new KafkaTransport(opts)
}
