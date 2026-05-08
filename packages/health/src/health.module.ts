import { Module } from '@banhmi/common'
import { HealthController } from './health.controller'
import { HEALTH_OPTIONS_TOKEN } from './tokens'
import type { HealthOptions } from './types'

/**
 * Module that mounts a health check endpoint at application bootstrap.
 *
 * Call {@link HealthModule.forRoot} with your indicator map to register the
 * endpoint. All configured indicators are evaluated in parallel on each
 * `GET <path>` request.
 *
 * @example
 * import { HealthModule, memoryIndicator } from '@banhmi/health'
 *
 * \@Module({
 *   imports: [
 *     HealthModule.forRoot({
 *       path: '/health',
 *       indicators: {
 *         memory: memoryIndicator({ heapUsedThresholdMb: 512 }),
 *       },
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class HealthModule {
  /**
   * Create a configured health module that mounts the health endpoint.
   *
   * @param opts - Options including the path and indicator map.
   * @returns A dynamically-created `@Module`.
   *
   * @example
   * HealthModule.forRoot({
   *   path: '/health',
   *   indicators: { memory: memoryIndicator() },
   * })
   */
  static forRoot(opts: HealthOptions = {}) {
    @Module({
      providers: [
        { provide: HEALTH_OPTIONS_TOKEN, useValue: opts },
        HealthController,
      ],
    })
    class HealthRootModule {}

    return HealthRootModule
  }
}
