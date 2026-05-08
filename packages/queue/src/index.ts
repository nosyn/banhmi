/**
 * @banhmi/queue — BullMQ-style Redis-backed job queues for Banhmi.
 *
 * Provides a {@link Queue} producer, a {@link Worker} consumer, class/method
 * decorators (`@Processor`, `@Process`), and a {@link QueueModule} that wires
 * everything together via Banhmi's DI container.
 *
 * @example
 * import { Module } from 'banhmi'
 * import { QueueModule, Processor, Process, InjectQueue } from '@banhmi/queue'
 * import type { ProcessorContext, Queue } from '@banhmi/queue'
 *
 * \@Injectable()
 * \@Processor('emails')
 * class EmailProcessor {
 *   \@Process('send')
 *   async send(ctx: ProcessorContext<{ to: string }>) {
 *     console.log('sending to', ctx.job.data.to)
 *   }
 * }
 *
 * \@Module({
 *   imports: [QueueModule.registerQueue({ name: 'emails' })],
 *   providers: [EmailProcessor],
 * })
 * class AppModule {}
 */

export { InjectQueue } from './inject-queue'
export { Process } from './process.decorator'
export { Processor } from './processor.decorator'
export { Queue } from './queue'
export { QueueModule } from './queue.module'
export { getQueueToken, QUEUE_OPTIONS } from './tokens'
export type { Job, JobOptions, ProcessorContext, QueueOptions } from './types'
export { Worker } from './worker'
