/**
 * @banhmi/health — Health check endpoint with built-in indicators.
 *
 * Provides `HealthModule.forRoot()` to mount a `GET /health` endpoint that
 * runs all configured indicators in parallel and returns a JSON summary.
 * Built-in indicators cover memory, disk, database (Bun.sql), Redis, and
 * arbitrary async functions.
 *
 * @example
 * import { HealthModule, memoryIndicator, customIndicator } from '@banhmi/health'
 *
 * \@Module({
 *   imports: [
 *     HealthModule.forRoot({
 *       path: '/health',
 *       indicators: {
 *         memory: memoryIndicator({ heapUsedThresholdMb: 512 }),
 *         api: customIndicator(async () => {
 *           const ok = await fetch('https://api.example.com').then(r => r.ok)
 *           return { status: ok ? 'up' : 'down' }
 *         }),
 *       },
 *     }),
 *   ],
 * })
 * class AppModule {}
 */

export { HealthController } from './health.controller'
export { HealthModule } from './health.module'
export { customIndicator } from './indicators/custom'
export { dbIndicator, type SqlConnection } from './indicators/db'
export { type DiskIndicatorOptions, diskIndicator } from './indicators/disk'
export {
  type MemoryIndicatorOptions,
  memoryIndicator,
} from './indicators/memory'
export { type RedisPingClient, redisIndicator } from './indicators/redis'
export { HEALTH_OPTIONS_TOKEN } from './tokens'
export type { HealthCheckResult, HealthIndicator, HealthOptions } from './types'
