import { Token } from '@banhmi/common'
import type { MailerOptions } from './types'

/**
 * DI token for the {@link MailerOptions} registered by `MailerModule.forRoot()`.
 *
 * @example
 * class MyService {
 *   static inject = [MAILER_OPTIONS_TOKEN] as const
 *   constructor(private opts: MailerOptions) {}
 * }
 */
export const MAILER_OPTIONS_TOKEN = Token<MailerOptions>('MAILER_OPTIONS')

/**
 * DI token for the {@link MailerService} singleton.
 *
 * Prefer injecting `MailerService` directly via `static inject`.
 *
 * @example
 * class MyService {
 *   static inject = [MAILER_SERVICE_TOKEN] as const
 * }
 */
export const MAILER_SERVICE_TOKEN =
  Token<import('./mailer.service').MailerService>('MAILER_SERVICE')
