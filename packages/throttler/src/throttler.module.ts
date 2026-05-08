import { Module } from '@banhmi/common'
import { MemoryThrottlerStorage } from './storage/memory'
import { ThrottlerMiddleware } from './throttler.middleware'
import { THROTTLER_OPTIONS } from './tokens'
import type { ThrottlerOptions } from './types'

/**
 * Token-bucket rate-limiting module.
 *
 * Call {@link ThrottlerModule.forRoot} to register the rate-limiting
 * middleware. Use `@Throttle` on controllers or handlers to override defaults;
 * use `@SkipThrottle` to exempt a handler entirely.
 *
 * @example
 * import { ThrottlerModule } from '@banhmi/throttler'
 *
 * \@Module({
 *   imports: [ThrottlerModule.forRoot({ ttl: 60_000, limit: 100 })],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class ThrottlerModule {
  /**
   * Create a configured throttler module.
   *
   * @param opts - Rate-limiting options. `ttl` (ms) and `limit` (requests)
   *   are required. `storage` defaults to {@link MemoryThrottlerStorage}.
   * @returns A dynamically-created `@Module` that registers
   *   {@link ThrottlerMiddleware}.
   *
   * @example
   * ThrottlerModule.forRoot({ ttl: 60_000, limit: 100 })
   */
  static forRoot(opts: ThrottlerOptions) {
    const resolvedOpts: ThrottlerOptions = {
      ...opts,
      storage: opts.storage ?? new MemoryThrottlerStorage(),
    }

    @Module({
      providers: [
        { provide: THROTTLER_OPTIONS, useValue: resolvedOpts },
        ThrottlerMiddleware,
      ],
    })
    class ThrottlerRootModule {}

    return ThrottlerRootModule
  }
}
