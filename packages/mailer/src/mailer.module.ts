import { Module } from '@banhmi/common'
import { MailerService } from './mailer.service'
import { MAILER_OPTIONS_TOKEN, MAILER_SERVICE_TOKEN } from './tokens'
import type { MailerOptions } from './types'

/**
 * Module that registers the {@link MailerService} for sending emails.
 *
 * Call {@link MailerModule.forRoot} with your SMTP transport options to
 * configure the mailer. Inject `MailerService` directly in your providers.
 *
 * @example
 * import { MailerModule } from '@banhmi/mailer'
 *
 * \@Module({
 *   imports: [
 *     MailerModule.forRoot({
 *       transport: { host: 'smtp.example.com', port: 587 },
 *       defaults: { from: 'noreply@example.com' },
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class MailerModule {
  /**
   * Create a configured mailer module.
   *
   * @param opts - Transport and template options.
   * @returns A dynamically-created `@Module`.
   *
   * @example
   * MailerModule.forRoot({
   *   transport: { host: 'smtp.example.com', port: 587 },
   *   templateDir: './templates',
   * })
   */
  static forRoot(opts: MailerOptions) {
    @Module({
      providers: [
        { provide: MAILER_OPTIONS_TOKEN, useValue: opts },
        MailerService,
        { provide: MAILER_SERVICE_TOKEN, useClass: MailerService },
      ],
      exports: [MailerService, MAILER_SERVICE_TOKEN],
    })
    class MailerRootModule {}

    return MailerRootModule
  }
}
