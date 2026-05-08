import { Token } from '@banhmi/common'
import type { Scheduler } from './scheduler'

/**
 * DI token for the {@link Scheduler} instance registered by
 * {@link ScheduleModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [SCHEDULER_TOKEN] as const
 *   constructor(private readonly scheduler: Scheduler) {}
 * }
 */
export const SCHEDULER_TOKEN = Token<Scheduler>('SCHEDULER')
