import type { Logger } from '@banhmi/logger'
import { InjectLogger } from '@banhmi/logger'
import { Interval } from '@banhmi/scheduling'
import { Injectable } from 'banhmi'
import { TasksService } from '../tasks/tasks.service'

/** GC threshold — delete tasks older than 7 days in production. */
const GC_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1_000

/**
 * Cleanup cron service — runs every 60 seconds and garbage-collects old tasks.
 *
 * Uses `@Interval` for precise millisecond control (test-friendly); swap for
 * `@Cron('0 * * * * *')` in a production setting.
 */
@Injectable()
export class CleanupService {
  static inject = [TasksService, InjectLogger('CleanupService')] as const

  constructor(
    private readonly tasks: TasksService,
    private readonly logger: Logger,
  ) {}

  /**
   * Run task GC every 60 seconds.
   */
  @Interval(60_000)
  runGc(): void {
    const deleted = this.tasks.gcOlderThan(GC_THRESHOLD_MS)
    if (deleted > 0) {
      this.logger.info('gc: deleted old tasks', { count: deleted })
    }
  }
}
