import type { ProcessorContext } from '@banhmi/queue'
import { Process, Processor } from '@banhmi/queue'
import { Injectable } from 'banhmi'

/**
 * Email queue processor — handles 'send' jobs from the 'emails' queue.
 *
 * @example
 * // Enqueue a job:
 * await queue.add('send', { to: 'user@example.com', subject: 'Welcome!' })
 */
@Injectable()
@Processor('emails')
export class EmailProcessor {
  /** Counter for tests — incremented on every successful send. */
  sendCount = 0

  /**
   * Handle 'send' jobs.
   *
   * @param ctx - Job context including the email payload.
   */
  @Process('send')
  async send(ctx: ProcessorContext<{ to: string; subject: string }>) {
    ctx.log(`Sending email to ${ctx.job.data.to}: ${ctx.job.data.subject}`)
    // simulate async send
    await new Promise((r) => setTimeout(r, 5))
    this.sendCount++
    ctx.log(`Email sent (total: ${this.sendCount})`)
  }
}
