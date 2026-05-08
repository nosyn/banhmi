import { createChildLoggerProvider } from '@banhmi/logger'
import { Module } from 'banhmi'
import { EmailController } from './email.controller'
import { EmailService } from './email.service'
import { EmailQueueProcessor } from './email-queue.processor'

/**
 * Module that groups the email queue controller, processor, and service.
 *
 * Requires `QueueModule.registerQueue({ name: 'emails' })` to be imported
 * in the parent module before this one.
 *
 * @example
 * \@Module({ imports: [QueueModule.registerQueue({ name: 'emails' }), EmailModule] })
 * class AppModule {}
 */
@Module({
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailQueueProcessor,
    // Child logger token for EmailQueueProcessor
    createChildLoggerProvider('EmailQueueProcessor'),
  ],
  exports: [EmailService],
})
export class EmailModule {}
