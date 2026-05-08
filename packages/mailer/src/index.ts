/**
 * @banhmi/mailer — Email sending with SMTP transport and template rendering.
 *
 * Provides `MailerModule.forRoot()` to configure the SMTP transport and
 * `MailerService.send()` to send emails. Supports template rendering via
 * the `eta` or `edge.js` template engines when `templateDir` is set.
 *
 * @example
 * import { MailerModule } from '@banhmi/mailer'
 *
 * \@Module({
 *   imports: [
 *     MailerModule.forRoot({
 *       transport: { host: 'smtp.example.com', port: 587 },
 *       defaults: { from: 'noreply@example.com' },
 *       templateDir: './templates',
 *     }),
 *   ],
 * })
 * class AppModule {}
 */

export { MailerModule } from './mailer.module'
export { MailerService } from './mailer.service'
export { MAILER_OPTIONS_TOKEN, MAILER_SERVICE_TOKEN } from './tokens'
export type { MailerOptions, MailMessage, SmtpTransport } from './types'
