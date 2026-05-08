import type { ClassConstructor } from '@banhmi/common'
import type {
  CronScheduleEntry,
  IntervalScheduleEntry,
  TimeoutScheduleEntry,
} from './metadata'
import { CRON_METADATA, INTERVAL_METADATA, TIMEOUT_METADATA } from './metadata'
import type { Scheduler } from './scheduler'

/**
 * Walks a list of provider instances and their classes to find methods
 * decorated with `@Cron`, `@Interval`, or `@Timeout`, then registers
 * them on the given {@link Scheduler}.
 *
 * Called by the scheduling bootstrap service during `onApplicationBootstrap`.
 *
 * @example
 * const explorer = new ScheduleExplorer()
 * explorer.explore(scheduler, [[instance, MyClass]])
 */
export class ScheduleExplorer {
  /**
   * Register all decorated schedule methods found in the supplied pairs.
   *
   * @param scheduler - The {@link Scheduler} to register jobs on.
   * @param pairs - Array of `[instance, ClassConstructor]` tuples to inspect.
   */
  explore(
    scheduler: Scheduler,
    pairs: Array<[object, ClassConstructor]>,
  ): void {
    for (const [instance, cls] of pairs) {
      const classMeta = cls[Symbol.metadata] as Record<symbol, unknown> | null
      if (!classMeta) continue

      const cronEntries =
        (classMeta[CRON_METADATA] as CronScheduleEntry[] | undefined) ?? []
      for (const entry of cronEntries) {
        const fn = (instance as Record<string, unknown>)[entry.methodName]
        if (typeof fn !== 'function') continue
        scheduler.cron(
          entry.expression,
          () => (fn as () => void | Promise<void>).call(instance),
          entry.opts,
        )
      }

      const intervalEntries =
        (classMeta[INTERVAL_METADATA] as IntervalScheduleEntry[] | undefined) ??
        []
      for (const entry of intervalEntries) {
        const fn = (instance as Record<string, unknown>)[entry.methodName]
        if (typeof fn !== 'function') continue
        scheduler.interval(entry.ms, () =>
          (fn as () => void | Promise<void>).call(instance),
        )
      }

      const timeoutEntries =
        (classMeta[TIMEOUT_METADATA] as TimeoutScheduleEntry[] | undefined) ??
        []
      for (const entry of timeoutEntries) {
        const fn = (instance as Record<string, unknown>)[entry.methodName]
        if (typeof fn !== 'function') continue
        scheduler.timeout(entry.ms, () =>
          (fn as () => void | Promise<void>).call(instance),
        )
      }
    }
  }
}
