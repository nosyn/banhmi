/**
 * A single health indicator function.
 *
 * Returns an object with a `status` of `'up'` or `'down'`, and optional
 * `details` for extra diagnostic information.
 *
 * @example
 * const myIndicator: HealthIndicator = async () => ({
 *   status: 'up',
 *   details: { version: '1.2.3' },
 * })
 */
export type HealthIndicator = () => Promise<{
  status: 'up' | 'down'
  details?: Record<string, unknown>
}>

/**
 * The result returned by the health endpoint.
 *
 * @example
 * {
 *   status: 'up',
 *   details: {
 *     memory: { status: 'up', heapUsedMb: 42 },
 *     db: { status: 'up' },
 *   },
 * }
 */
export type HealthCheckResult = {
  /** Overall status. `'up'` if all indicators are up; `'down'` if any are down. */
  status: 'up' | 'down'
  /** Per-indicator results, keyed by indicator name. */
  details: Record<string, { status: 'up' | 'down'; [key: string]: unknown }>
}

/**
 * Options for {@link HealthModule.forRoot}.
 *
 * @example
 * HealthModule.forRoot({
 *   path: '/health',
 *   indicators: {
 *     memory: memoryIndicator({ heapUsedThresholdMb: 512 }),
 *   },
 * })
 */
export type HealthOptions = {
  /**
   * URL path for the health endpoint.
   *
   * @defaultValue '/health'
   */
  path?: string
  /**
   * Named health indicators to evaluate on each request.
   * Keys become the indicator names in the response details.
   */
  indicators?: Record<string, HealthIndicator>
}
