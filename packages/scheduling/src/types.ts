/**
 * Options for {@link Cron} and {@link Scheduler.cron}.
 *
 * @example
 * \@Cron('0 0 * * *', { timeZone: 'UTC' })
 * runAtMidnight() {}
 */
export type CronOptions = {
  /**
   * IANA time zone identifier. Defaults to the local system time zone.
   * Time-zone support is planned for a future release; this field is
   * reserved for forward compatibility.
   */
  timeZone?: string
}

/**
 * A handle returned by {@link Scheduler} methods that allows cancelling a
 * scheduled job.
 *
 * @example
 * const handle = scheduler.interval(1000, () => console.log('tick'))
 * // ... later:
 * handle.cancel()
 */
export interface ScheduleHandle {
  /**
   * Cancel this scheduled job. Subsequent ticks will not fire.
   * Calling `cancel()` more than once is a no-op.
   */
  cancel(): void
}

/**
 * Parsed representation of a 5-field cron expression.
 *
 * Each field is a `Set<number>` containing the valid values for that field.
 *
 * @example
 * const parsed = parseCron('0 12 * * *')
 * parsed.minute  // Set { 0 }
 * parsed.hour    // Set { 12 }
 */
export type ParsedCron = {
  minute: Set<number>
  hour: Set<number>
  dom: Set<number>
  month: Set<number>
  dow: Set<number>
}
