import { statfs } from 'node:fs/promises'
import type { HealthIndicator } from '../types'

/**
 * Options for {@link diskIndicator}.
 *
 * @example
 * diskIndicator({ path: '/', freeBytesThreshold: 1024 * 1024 * 1024 })
 */
export type DiskIndicatorOptions = {
  /**
   * Filesystem path to check.
   *
   * @defaultValue '/'
   */
  path?: string
  /**
   * Minimum free bytes required. Reports `down` if available space falls
   * below this threshold.
   *
   * @defaultValue 100MB (104857600)
   */
  freeBytesThreshold?: number
}

/**
 * Built-in health indicator that checks available disk space using
 * `fs.statfs`.
 *
 * @param opts - Disk check options.
 * @returns A {@link HealthIndicator} function.
 *
 * @example
 * HealthModule.forRoot({
 *   indicators: {
 *     disk: diskIndicator({ path: '/', freeBytesThreshold: 1_000_000_000 }),
 *   },
 * })
 */
export function diskIndicator(
  opts: DiskIndicatorOptions = {},
): HealthIndicator {
  const checkPath = opts.path ?? '/'
  const threshold = opts.freeBytesThreshold ?? 100 * 1024 * 1024

  return async () => {
    try {
      const stats = await statfs(checkPath)
      const freeBytes = stats.bfree * stats.bsize
      const isUp = freeBytes >= threshold
      return {
        status: isUp ? 'up' : 'down',
        details: {
          path: checkPath,
          freeMb: Math.round(freeBytes / (1024 * 1024)),
          thresholdMb: Math.round(threshold / (1024 * 1024)),
        },
      }
    } catch (err) {
      return {
        status: 'down',
        details: {
          path: checkPath,
          error: String(err),
        },
      }
    }
  }
}
