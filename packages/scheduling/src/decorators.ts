import type {
  CronScheduleEntry,
  IntervalScheduleEntry,
  TimeoutScheduleEntry,
} from './metadata'
import { CRON_METADATA, INTERVAL_METADATA, TIMEOUT_METADATA } from './metadata'
import type { CronOptions } from './types'

/**
 * Method decorator that schedules the decorated method as a recurring cron
 * job when the application bootstraps.
 *
 * The cron expression uses standard 5-field syntax:
 * `minute hour day-of-month month day-of-week`.
 *
 * @param expression - Standard 5-field cron string (e.g. `'0 0 * * *'`).
 * @param opts - Optional {@link CronOptions}.
 *
 * @example
 * import { Injectable } from 'banhmi'
 * import { Cron } from '@banhmi/scheduling'
 *
 * \@Injectable()
 * class HeartbeatService {
 *   \@Cron('0 * * * *')
 *   ping() {
 *     console.log('ping', new Date())
 *   }
 * }
 */
export function Cron(expression: string, opts: CronOptions = {}) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const methodName = context.name as string
    const existing =
      (context.metadata[CRON_METADATA] as CronScheduleEntry[] | undefined) ?? []
    context.metadata[CRON_METADATA] = [
      ...existing,
      { methodName, expression, opts },
    ]
  }
}

/**
 * Method decorator that schedules the decorated method to fire repeatedly
 * at a fixed interval (in milliseconds) when the application bootstraps.
 *
 * @param ms - Interval in milliseconds.
 *
 * @example
 * import { Injectable } from 'banhmi'
 * import { Interval } from '@banhmi/scheduling'
 *
 * \@Injectable()
 * class HealthService {
 *   \@Interval(5000)
 *   checkHealth() {
 *     console.log('health check')
 *   }
 * }
 */
export function Interval(ms: number) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const methodName = context.name as string
    const existing =
      (context.metadata[INTERVAL_METADATA] as
        | IntervalScheduleEntry[]
        | undefined) ?? []
    context.metadata[INTERVAL_METADATA] = [...existing, { methodName, ms }]
  }
}

/**
 * Method decorator that schedules the decorated method to fire once after a
 * delay (in milliseconds) when the application bootstraps.
 *
 * @param ms - Delay in milliseconds before firing.
 *
 * @example
 * import { Injectable } from 'banhmi'
 * import { Timeout } from '@banhmi/scheduling'
 *
 * \@Injectable()
 * class InitService {
 *   \@Timeout(1000)
 *   warmupCache() {
 *     console.log('cache warm')
 *   }
 * }
 */
export function Timeout(ms: number) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const methodName = context.name as string
    const existing =
      (context.metadata[TIMEOUT_METADATA] as
        | TimeoutScheduleEntry[]
        | undefined) ?? []
    context.metadata[TIMEOUT_METADATA] = [...existing, { methodName, ms }]
  }
}
