import type { HealthIndicator } from '../types'

/**
 * Options for {@link memoryIndicator}.
 *
 * @example
 * memoryIndicator({ heapUsedThresholdMb: 512 })
 */
export type MemoryIndicatorOptions = {
  /**
   * Maximum heap usage in megabytes before the indicator reports `down`.
   *
   * @defaultValue 512
   */
  heapUsedThresholdMb?: number
}

/**
 * Built-in health indicator that checks Node.js heap usage.
 *
 * Reports `down` when `process.memoryUsage().heapUsed` exceeds
 * `heapUsedThresholdMb * 1024 * 1024`.
 *
 * @param opts - Threshold options.
 * @returns A {@link HealthIndicator} function.
 *
 * @example
 * HealthModule.forRoot({
 *   indicators: {
 *     memory: memoryIndicator({ heapUsedThresholdMb: 512 }),
 *   },
 * })
 */
export function memoryIndicator(
  opts: MemoryIndicatorOptions = {},
): HealthIndicator {
  const thresholdMb = opts.heapUsedThresholdMb ?? 512
  const thresholdBytes = thresholdMb * 1024 * 1024

  return async () => {
    const usage = process.memoryUsage()
    const heapUsedMb = Math.round(usage.heapUsed / (1024 * 1024))
    const isUp = usage.heapUsed <= thresholdBytes
    return {
      status: isUp ? 'up' : 'down',
      details: {
        heapUsedMb,
        thresholdMb,
      },
    }
  }
}
