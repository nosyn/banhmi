import { Module } from '@banhmi/common'
import { MS_TRANSPORT_TOKEN } from './tokens'
import type { MicroserviceOptions } from './types'

/**
 * Root module for `@banhmi/microservices`.
 *
 * Call `forRoot()` to configure the chosen transport and register it in the
 * DI container.
 *
 * @example
 * import { MicroserviceModule, tcpTransport } from '@banhmi/microservices'
 *
 * \@Module({
 *   imports: [MicroserviceModule.forRoot({ transport: tcpTransport({ port: 3001 }) })],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class MicroserviceModule {
  /**
   * Configure the microservice transport.
   *
   * @param options - {@link MicroserviceOptions} with a `transport` field.
   * @returns A dynamically created `@Module` class.
   *
   * @example
   * MicroserviceModule.forRoot({ transport: tcpTransport({ port: 3001 }) })
   */
  static forRoot(options: MicroserviceOptions) {
    @Module({
      providers: [
        {
          provide: MS_TRANSPORT_TOKEN,
          useValue: options.transport,
        },
      ],
      exports: [MS_TRANSPORT_TOKEN],
    })
    class MicroserviceRootModule {}

    return MicroserviceRootModule
  }
}
