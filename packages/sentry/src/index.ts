/**
 * @banhmi/sentry — Sentry SDK bridge for Banhmi.
 *
 * Provides a {@link SentryModule} that initialises `@sentry/node` at
 * application bootstrap, a {@link SentryExceptionFilter} that captures
 * unhandled exceptions, and a {@link SentryInterceptor} that wraps request
 * handlers in Sentry performance spans.
 *
 * Requires `@sentry/node` v7 or v8 as a peer dependency.
 *
 * @example
 * import { Module } from 'banhmi'
 * import {
 *   SentryModule,
 *   SentryExceptionFilter,
 *   SentryInterceptor,
 * } from '@banhmi/sentry'
 *
 * \@Module({
 *   imports: [
 *     SentryModule.forRoot({
 *       dsn: Bun.env.SENTRY_DSN!,
 *       environment: 'production',
 *       tracesSampleRate: 0.1,
 *     }),
 *   ],
 * })
 * class AppModule {}
 */

export { SentryExceptionFilter } from './sentry.filter'
export { SentryInterceptor } from './sentry.interceptor'
export { SentryModule } from './sentry.module'
export { SENTRY_CLIENT, SENTRY_OPTIONS } from './tokens'
export type { SentryOptions } from './types'
