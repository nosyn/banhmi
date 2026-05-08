/**
 * @banhmi/scheduling — Cron, interval, and timeout scheduling for Banhmi.
 *
 * Provides the {@link Scheduler} class for programmatic scheduling and
 * `@Cron`, `@Interval`, `@Timeout` method decorators for declarative
 * scheduling. `parseCron` and `nextCronTime` utilities are exported for
 * custom use.
 *
 * @example
 * import { ScheduleModule } from '@banhmi/scheduling'
 *
 * \@Module({ imports: [ScheduleModule.forRoot()] })
 * class AppModule {}
 */

export { nextCronTime, parseCron } from './cron-parser'
export { Cron, Interval, Timeout } from './decorators'
export { Scheduler } from './scheduler'
export { ScheduleModule } from './scheduler.module'
export { SCHEDULER_TOKEN } from './tokens'
export type { CronOptions, ParsedCron, ScheduleHandle } from './types'
