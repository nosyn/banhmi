/**
 * SMTP transport configuration passed to `nodemailer.createTransport()`.
 *
 * @example
 * {
 *   host: 'smtp.example.com',
 *   port: 587,
 *   secure: false,
 *   auth: { user: 'me@example.com', pass: 'secret' },
 * }
 */
export type SmtpTransport = {
  host: string
  port?: number
  secure?: boolean
  auth?: {
    user: string
    pass: string
  }
}

/**
 * A mail message to send.
 *
 * @example
 * {
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   text: 'Hello, world!',
 * }
 */
export type MailMessage = {
  /** Recipient email(s). */
  to: string | string[]
  /** Sender address. Falls back to `MailerOptions.defaults.from`. */
  from?: string
  /** Email subject line. */
  subject: string
  /** Plain-text body. */
  text?: string
  /** HTML body. Auto-generated when `template` is set. */
  html?: string
  /**
   * Template name (without extension). Requires `templateDir` to be
   * configured in `MailerOptions`.
   */
  template?: string
  /** Template context/locals passed to the template engine. */
  context?: Record<string, unknown>
}

/**
 * Configuration options for {@link MailerModule.forRoot}.
 *
 * @example
 * MailerModule.forRoot({
 *   transport: { host: 'smtp.example.com', port: 587 },
 *   defaults: { from: 'noreply@example.com' },
 *   templateDir: './templates',
 *   templateEngine: 'eta',
 * })
 */
export type MailerOptions = {
  /** SMTP transport configuration. */
  transport: SmtpTransport
  /**
   * Message defaults applied to every send.
   */
  defaults?: {
    /** Default sender address. */
    from?: string
  }
  /**
   * Directory containing email templates.
   * Required when using the `template` field on messages.
   */
  templateDir?: string
  /**
   * Template engine to use for rendering email templates.
   *
   * @defaultValue 'eta'
   */
  templateEngine?: 'eta' | 'edge'
}
