import { EVENT_EMITTER_TOKEN, type EventEmitter } from '@banhmi/events'
import type { Logger } from '@banhmi/logger'
import { InjectLogger } from '@banhmi/logger'
import type { ProcessorContext } from '@banhmi/queue'
import { Process, Processor } from '@banhmi/queue'
import { Injectable } from 'banhmi'
import type { SentEmail } from './email.service'
import { EmailService } from './email.service'

/**
 * Job payload for 'send' jobs on the 'emails' queue.
 *
 * @example
 * await queue.add('send', { to: 'user@example.com', subject: 'Hello' })
 */
export type EmailJob = {
  /** Recipient address. */
  to: string
  /** Email subject line. */
  subject: string
}

/**
 * Queue processor that handles 'send' jobs from the 'emails' queue.
 *
 * On success:
 * - Records the sent email via {@link EmailService}.
 * - Emits an `email.sent` event on the shared {@link EventEmitter}.
 *
 * @example
 * // In a module:
 * \@Module({ providers: [EmailQueueProcessor] })
 */
@Injectable()
@Processor('emails')
export class EmailQueueProcessor {
  static inject = [
    EmailService,
    EVENT_EMITTER_TOKEN,
    InjectLogger('EmailQueueProcessor'),
  ] as const

  constructor(
    private readonly emailService: EmailService,
    private readonly emitter: EventEmitter,
    private readonly logger: Logger,
  ) {}

  /**
   * Process an email 'send' job.
   *
   * Simulates async work, records the sent email, and emits `email.sent`.
   *
   * @param ctx - Job context carrying the {@link EmailJob} payload.
   */
  @Process('send')
  async sendEmail(ctx: ProcessorContext<EmailJob>): Promise<void> {
    const { to, subject } = ctx.job.data

    ctx.log(`Processing send job to ${to}`)
    this.logger.info('processing email job', { to, subject, jobId: ctx.job.id })

    // Simulate async work (e.g. SMTP call)
    await new Promise<void>((resolve) => setTimeout(resolve, 5))

    const sent: SentEmail = {
      id: ctx.job.id,
      to,
      subject,
    }

    this.emailService.record(sent)
    this.emitter.emit('email.sent', sent)

    ctx.log(`Email sent to ${to}`)
    this.logger.info('email sent', { to, subject, jobId: ctx.job.id })
  }
}
