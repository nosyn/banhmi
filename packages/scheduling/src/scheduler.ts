import { nextCronTime, parseCron } from './cron-parser'
import type { CronOptions, ScheduleHandle } from './types'

type Handler = () => void | Promise<void>

/**
 * Provides programmatic scheduling via cron expressions, fixed intervals, and
 * one-shot timeouts. All handles returned support `.cancel()`.
 *
 * Returned handles should be cancelled on shutdown via {@link cancelAll} or
 * individually. {@link ScheduleModule} calls `cancelAll()` during
 * `OnApplicationShutdown`.
 *
 * @example
 * import { Scheduler } from '@banhmi/scheduling'
 *
 * const scheduler = new Scheduler()
 * const handle = scheduler.interval(1000, () => console.log('tick'))
 * // later:
 * handle.cancel()
 */
export class Scheduler {
  private handles: ScheduleHandle[] = []

  /**
   * Schedule a recurring job from a 5-field cron expression.
   *
   * The job fires at the next matching minute and continues until `.cancel()`
   * is called. The first fire is computed via {@link nextCronTime}.
   *
   * @param expression - Standard 5-field cron string (e.g. `'0 0 * * *'`).
   * @param handler - Function to invoke on each tick.
   * @param opts - Optional {@link CronOptions}.
   * @returns A {@link ScheduleHandle} that cancels the job when called.
   *
   * @example
   * scheduler.cron('0 0 * * *', () => log('midnight'))
   */
  cron(
    expression: string,
    handler: Handler,
    _opts: CronOptions = {},
  ): ScheduleHandle {
    const parsed = parseCron(expression)
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    const schedule = (): void => {
      if (cancelled) return
      const now = new Date()
      const next = nextCronTime(parsed, now)
      const delay = next.getTime() - now.getTime()
      timerId = setTimeout(async () => {
        if (cancelled) return
        try {
          await handler()
        } catch {
          // swallow handler errors
        }
        schedule()
      }, delay)
    }

    schedule()

    const handle: ScheduleHandle = {
      cancel() {
        cancelled = true
        if (timerId !== null) clearTimeout(timerId)
      },
    }

    this.handles.push(handle)
    return handle
  }

  /**
   * Schedule a handler to fire repeatedly at a fixed interval.
   *
   * @param ms - Interval in milliseconds.
   * @param handler - Function to invoke on each tick.
   * @returns A {@link ScheduleHandle} that stops the interval when cancelled.
   *
   * @example
   * const handle = scheduler.interval(5000, () => checkHealth())
   */
  interval(ms: number, handler: Handler): ScheduleHandle {
    const timerId = setInterval(async () => {
      try {
        await handler()
      } catch {
        // swallow handler errors
      }
    }, ms)

    const handle: ScheduleHandle = {
      cancel() {
        clearInterval(timerId)
      },
    }

    this.handles.push(handle)
    return handle
  }

  /**
   * Schedule a handler to fire once after a delay.
   *
   * @param ms - Delay in milliseconds before firing.
   * @param handler - Function to invoke after the delay.
   * @returns A {@link ScheduleHandle} that cancels the timeout if not yet fired.
   *
   * @example
   * scheduler.timeout(10_000, () => log('10 s elapsed'))
   */
  timeout(ms: number, handler: Handler): ScheduleHandle {
    const timerId = setTimeout(async () => {
      try {
        await handler()
      } catch {
        // swallow handler errors
      }
    }, ms)

    const handle: ScheduleHandle = {
      cancel() {
        clearTimeout(timerId)
      },
    }

    this.handles.push(handle)
    return handle
  }

  /**
   * Cancel all scheduled jobs registered on this scheduler instance.
   *
   * Called automatically during `OnApplicationShutdown` by
   * {@link ScheduleModule}.
   *
   * @example
   * scheduler.cancelAll()
   */
  cancelAll(): void {
    for (const handle of this.handles) {
      handle.cancel()
    }
    this.handles = []
  }
}
