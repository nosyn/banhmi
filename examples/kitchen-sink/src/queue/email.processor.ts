import type { Logger } from '@banhmi/logger'
import { InjectLogger } from '@banhmi/logger'
import type { ProcessorContext } from '@banhmi/queue'
import { Process, Processor } from '@banhmi/queue'
import { Injectable } from 'banhmi'

/**
 * Job payload for `send` jobs on the `emails` queue.
 */
export type EmailJobPayload = {
  /** Recipient email address. */
  to: string
  /** Email subject line. */
  subject: string
}

/**
 * Mock email queue processor.
 *
 * Simulates sending an email by logging the job payload. In a real app this
 * would call an SMTP service or third-party email provider.
 */
@Injectable()
@Processor('emails')
export class EmailProcessor {
  static inject = [InjectLogger('EmailProcessor')] as const

  constructor(private readonly logger: Logger) {}

  /**
   * Process a `send` job.
   *
   * @param ctx - Job context carrying an {@link EmailJobPayload}.
   */
  @Process('send')
  async send(ctx: ProcessorContext<EmailJobPayload>): Promise<void> {
    const { to, subject } = ctx.job.data
    ctx.log(`Sending email to ${to}`)
    this.logger.info('[mailer] email sent (mocked)', {
      to,
      subject,
      jobId: ctx.job.id,
    })
    // Simulate async SMTP call
    await Bun.sleep(1)
  }
}
