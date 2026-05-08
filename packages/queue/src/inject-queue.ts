import { getQueueToken } from './tokens'

/**
 * Helper for `static inject = [...]` that returns the DI token for the named
 * queue. The resolved value is a {@link Queue} instance.
 *
 * @param name - Queue name — must match the corresponding
 *   `QueueModule.registerQueue({ name })` call.
 *
 * @example
 * import { InjectQueue } from '@banhmi/queue'
 * import type { Queue } from '@banhmi/queue'
 *
 * class EmailService {
 *   static inject = [InjectQueue('emails')] as const
 *   constructor(private readonly queue: Queue<{ to: string }>) {}
 * }
 */
export function InjectQueue(name: string): symbol {
  return getQueueToken(name)
}
