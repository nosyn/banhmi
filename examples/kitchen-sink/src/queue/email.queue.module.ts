import { createChildLoggerProvider } from '@banhmi/logger'
import { Module } from 'banhmi'
import { EmailProcessor } from './email.processor'

/**
 * Email queue module.
 *
 * Registers the {@link EmailProcessor} consumer for the `emails` queue.
 * `QueueModule.registerQueue({ name: 'emails' })` must be imported in the
 * parent module before this one.
 */
@Module({
  providers: [EmailProcessor, createChildLoggerProvider('EmailProcessor')],
})
export class EmailQueueModule {}
