import { renderTemplate } from './template/render'
import { MAILER_OPTIONS_TOKEN } from './tokens'
import type { MailerOptions, MailMessage } from './types'

/**
 * Minimal nodemailer transport interface used internally.
 *
 * @internal
 */
type NodemailerTransport = {
  sendMail(opts: Record<string, unknown>): Promise<unknown>
  close?(): void
}

/**
 * Service that sends email messages via the configured SMTP transport.
 *
 * Lazy-imports `nodemailer` on first send. If `nodemailer` is not installed,
 * `send()` throws a clear error.
 *
 * @example
 * import { MailerService } from '@banhmi/mailer'
 *
 * class UserService {
 *   static inject = [MailerService] as const
 *   constructor(private mailer: MailerService) {}
 *
 *   async welcome(email: string, name: string) {
 *     await this.mailer.send({
 *       to: email,
 *       subject: 'Welcome!',
 *       template: 'welcome',
 *       context: { name },
 *     })
 *   }
 * }
 */
export class MailerService {
  static inject = [MAILER_OPTIONS_TOKEN] as const

  private transport: NodemailerTransport | null = null

  constructor(private readonly opts: MailerOptions) {}

  /**
   * Send an email message.
   *
   * - If `message.template` is set and `opts.templateDir` is configured,
   *   the template is rendered and the result is set as `html`.
   * - If `message.from` is not set, falls back to `opts.defaults?.from`.
   *
   * @param message - The mail message to send.
   * @returns Promise that resolves when the mail is accepted by the transport.
   * @throws When `nodemailer` is not installed, or the transport rejects.
   *
   * @example
   * await mailer.send({ to: 'user@example.com', subject: 'Hi', text: 'Hello' })
   */
  async send(message: MailMessage): Promise<void> {
    const transport = await this.getTransport()

    let html = message.html

    if (message.template) {
      html = await renderTemplate(
        message.template,
        message.context ?? {},
        this.opts,
      )
    }

    const mailOptions: Record<string, unknown> = {
      from: message.from ?? this.opts.defaults?.from,
      to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
      subject: message.subject,
      text: message.text,
      html,
    }

    // Remove undefined fields
    for (const key of Object.keys(mailOptions)) {
      if (mailOptions[key] === undefined) {
        delete mailOptions[key]
      }
    }

    await transport.sendMail(mailOptions)
  }

  private async getTransport(): Promise<NodemailerTransport> {
    if (this.transport) return this.transport

    let nodemailer: {
      createTransport(opts: Record<string, unknown>): NodemailerTransport
    }
    try {
      nodemailer = await import('nodemailer')
    } catch {
      throw new Error(
        '@banhmi/mailer: nodemailer is not installed. Run: bun add nodemailer',
      )
    }

    this.transport = nodemailer.createTransport(
      this.opts.transport as Record<string, unknown>,
    )
    return this.transport
  }
}
