import { PROCESSOR_METADATA } from './metadata'

/**
 * Class decorator that marks a class as a queue processor for the given
 * queue name. The queue explorer discovers all `@Processor` classes at
 * bootstrap and starts a {@link Worker} for each.
 *
 * Combine with `@Process(jobName)` method decorators to route jobs.
 *
 * @param queueName - The name of the queue to consume from (e.g. `'emails'`).
 *
 * @example
 * import { Injectable } from 'banhmi'
 * import { Processor, Process } from '@banhmi/queue'
 * import type { ProcessorContext } from '@banhmi/queue'
 *
 * \@Injectable()
 * \@Processor('emails')
 * class EmailProcessor {
 *   \@Process('send')
 *   async send(ctx: ProcessorContext<{ to: string }>) {
 *     console.log('sending to', ctx.job.data.to)
 *   }
 * }
 */
export function Processor(queueName: string) {
  return (_target: unknown, context: ClassDecoratorContext): void => {
    context.metadata[PROCESSOR_METADATA] = queueName
  }
}
