import type { Logger } from '@banhmi/logger'
import { InjectLogger } from '@banhmi/logger'
import { Interval } from '@banhmi/scheduling'
import { Injectable } from 'banhmi'

/**
 * Emits a heartbeat log at a fixed interval.
 *
 * The 200ms interval is deliberately short so integration tests can observe
 * the log without waiting for a full cron cycle.
 *
 * @example
 * // In a module:
 * providers: [HeartbeatService]
 */
@Injectable()
export class HeartbeatService {
  static inject = [InjectLogger('HeartbeatService')] as const

  constructor(private readonly logger: Logger) {}

  /**
   * Log a heartbeat every 200ms.
   */
  @Interval(200)
  tick(): void {
    this.logger.info('heartbeat')
  }
}
