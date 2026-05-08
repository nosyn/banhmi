import type {
  MicroserviceMessage,
  MicroserviceResponse,
  Transport,
} from '../types'

/** Options accepted by {@link grpcTransport}. */
export interface GrpcTransportOptions {
  /**
   * gRPC server address.
   *
   * @example 'localhost:5000'
   */
  url?: string
  /**
   * Path to the `.proto` file defining the service.
   */
  protoPath?: string
  /**
   * The fully-qualified package name of the gRPC service.
   *
   * @example 'cats.CatsService'
   */
  package?: string
}

/**
 * gRPC transport stub for `@banhmi/microservices`.
 *
 * @remarks
 * **Status: Tier C stub — not fully implemented.**
 *
 * `@grpc/grpc-js` requires Node.js native addons (`grpc_node.node`) that
 * cannot be loaded under Bun's runtime without native-addon support, which
 * is not yet stable in Bun. A full implementation is deferred until
 * `@grpc/grpc-js` ships a Bun-compatible build or Bun's native-addon
 * loading reaches GA.
 *
 * TODO(wave-9): revisit once @grpc/grpc-js is Bun-compatible.
 *
 * @example
 * // stub usage — throws at runtime
 * const transport = grpcTransport({ url: 'localhost:5000', protoPath: './cats.proto', package: 'cats.CatsService' })
 */
export class GrpcTransport implements Transport {
  // biome-ignore lint/complexity/noUselessConstructor: intentional stub constructor that accepts options
  constructor(_opts: GrpcTransportOptions = {}) {}

  async listen(
    _handler: (
      msg: MicroserviceMessage,
    ) => Promise<MicroserviceResponse | undefined>,
  ): Promise<void> {
    throw new Error(
      '[GrpcTransport] Not implemented (Tier C stub). ' +
        '@grpc/grpc-js requires native addons not yet stable in Bun. ' +
        'Use customTransport() instead. ' +
        'TODO(wave-9): implement when @grpc/grpc-js is Bun-compatible.',
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
      '[GrpcTransport] Not implemented (Tier C stub). ' +
        '@grpc/grpc-js requires native addons not yet stable in Bun. ' +
        'Use customTransport() instead. ' +
        'TODO(wave-9): implement when @grpc/grpc-js is Bun-compatible.',
    )
  }

  async emit(_pattern: string, _data: unknown): Promise<void> {
    throw new Error(
      '[GrpcTransport] Not implemented (Tier C stub). ' +
        '@grpc/grpc-js requires native addons not yet stable in Bun. ' +
        'Use customTransport() instead. ' +
        'TODO(wave-9): implement when @grpc/grpc-js is Bun-compatible.',
    )
  }
}

/**
 * Create a gRPC transport stub.
 *
 * @remarks **Tier C stub — throws at runtime. See {@link GrpcTransport} docs.**
 *
 * @param opts - {@link GrpcTransportOptions}
 * @returns A new {@link GrpcTransport} stub.
 *
 * @example
 * // TODO(wave-9): use once @grpc/grpc-js is Bun-compatible
 * const transport = grpcTransport({ url: 'localhost:5000' })
 */
export function grpcTransport(opts?: GrpcTransportOptions): GrpcTransport {
  return new GrpcTransport(opts)
}
