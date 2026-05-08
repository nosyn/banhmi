import type { HealthIndicator } from '../types'

/**
 * Wrap any async function as a {@link HealthIndicator}.
 *
 * The function should return `{ status: 'up' | 'down', details?: ... }`.
 * If it throws, the indicator reports `down` with the error message.
 *
 * @param fn - Async function that returns an indicator result.
 * @returns A {@link HealthIndicator} function.
 *
 * @example
 * HealthModule.forRoot({
 *   indicators: {
 *     myService: customIndicator(async () => {
 *       const ok = await ping('https://api.example.com/health')
 *       return { status: ok ? 'up' : 'down' }
 *     }),
 *   },
 * })
 */
export function customIndicator(
  fn: () => Promise<{
    status: 'up' | 'down'
    details?: Record<string, unknown>
  }>,
): HealthIndicator {
  return async () => {
    try {
      return await fn()
    } catch (err) {
      return {
        status: 'down',
        details: { error: String(err) },
      }
    }
  }
}
