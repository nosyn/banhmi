import { Token } from '@banhmi/common'
import type { SentryOptions } from './types'

/**
 * DI token for the {@link SentryOptions} registered via
 * {@link SentryModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [SENTRY_OPTIONS] as const
 *   constructor(private readonly opts: SentryOptions) {}
 * }
 */
export const SENTRY_OPTIONS = Token<SentryOptions>('SENTRY_OPTIONS')

/**
 * DI token for the raw Sentry client namespace (the `@sentry/node` module
 * export). Useful for advanced usage where you need direct Sentry access.
 *
 * @example
 * class MyErrorReporter {
 *   static inject = [SENTRY_CLIENT] as const
 *   constructor(private readonly sentry: typeof import('@sentry/node')) {}
 * }
 */
export const SENTRY_CLIENT =
  Token<typeof import('@sentry/node')>('SENTRY_CLIENT')
