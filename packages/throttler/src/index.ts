/**
 * @banhmi/throttler — Token-bucket rate limiting for Banhmi applications.
 *
 * Provides `ThrottlerModule.forRoot()` for global rate limiting, with
 * per-route overrides via `@Throttle` and `@SkipThrottle` decorators.
 * Uses `MemoryThrottlerStorage` by default; plug in `RedisThrottlerStorage`
 * (from `@banhmi/throttler/redis`) for distributed environments.
 *
 * @example
 * import { ThrottlerModule } from '@banhmi/throttler'
 *
 * \@Module({
 *   imports: [ThrottlerModule.forRoot({ ttl: 60_000, limit: 100 })],
 * })
 * class AppModule {}
 */

export { SkipThrottle, Throttle } from './decorators'
export { MemoryThrottlerStorage } from './storage/memory'
export { ThrottlerModule } from './throttler.module'
export { THROTTLER_OPTIONS } from './tokens'
export type {
  ThrottleConfig,
  ThrottlerOptions,
  ThrottlerStorage,
} from './types'
