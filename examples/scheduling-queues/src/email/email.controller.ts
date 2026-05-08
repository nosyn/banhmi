import type { Queue } from '@banhmi/queue'
import { InjectQueue } from '@banhmi/queue'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, HttpCode, Post } from 'banhmi'
import { EmailService } from './email.service'
import type { EmailJob } from './email-queue.processor'

/**
 * HTTP interface for the email queue.
 *
 * - `POST /email` — enqueue a send job; returns `{ id: string }`.
 * - `GET /sent` — list all emails processed by the queue worker.
 */
@Controller('/email')
export class EmailController {
  static inject = [EmailService, InjectQueue('emails')] as const

  constructor(
    private readonly emailService: EmailService,
    private readonly emailQueue: Queue<EmailJob>,
  ) {}

  /**
   * Enqueue an email send job.
   *
   * @param ctx - Route context; reads `{ to, subject }` from the JSON body.
   * @returns `{ id }` of the newly created job.
   *
   * @example
   * POST /email
   * { "to": "user@example.com", "subject": "Hello" }
   * → { "id": "abc-123" }
   */
  @Post()
  @HttpCode(202)
  async enqueue(ctx: RouteCtx): Promise<{ id: string }> {
    const body = await ctx.json<{ to: string; subject: string }>()
    const job = await this.emailQueue.add('send', {
      to: body.to,
      subject: body.subject,
    })
    return { id: job.id }
  }

  /**
   * Return all emails that have been processed by the queue worker.
   *
   * @returns Array of sent email records.
   *
   * @example
   * GET /sent
   * → [{ id: "abc-123", to: "user@example.com", subject: "Hello" }]
   */
  @Get('/sent')
  listSent() {
    return this.emailService.listSent()
  }
}
