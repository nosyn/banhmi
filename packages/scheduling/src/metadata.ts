import type { CronOptions } from './types'

/**
 * Symbol key used to store `@Cron` entries in `Symbol.metadata`.
 *
 * Stored value is `Array<CronScheduleEntry>`.
 *
 * @example
 * const entries = (MyClass[Symbol.metadata] ?? {})[CRON_METADATA]
 */
export const CRON_METADATA: unique symbol = Symbol('banhmi:cron')

/**
 * Symbol key used to store `@Interval` entries in `Symbol.metadata`.
 *
 * Stored value is `Array<IntervalScheduleEntry>`.
 */
export const INTERVAL_METADATA: unique symbol = Symbol('banhmi:interval')

/**
 * Symbol key used to store `@Timeout` entries in `Symbol.metadata`.
 *
 * Stored value is `Array<TimeoutScheduleEntry>`.
 */
export const TIMEOUT_METADATA: unique symbol = Symbol('banhmi:timeout')

/**
 * Metadata entry for a `@Cron`-decorated method.
 */
export type CronScheduleEntry = {
  methodName: string
  expression: string
  opts: CronOptions
}

/**
 * Metadata entry for an `@Interval`-decorated method.
 */
export type IntervalScheduleEntry = {
  methodName: string
  ms: number
}

/**
 * Metadata entry for a `@Timeout`-decorated method.
 */
export type TimeoutScheduleEntry = {
  methodName: string
  ms: number
}
