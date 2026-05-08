import type { OnApplicationBootstrap } from '@banhmi/common'
import { Module } from '@banhmi/common'
import { SENTRY_CLIENT, SENTRY_OPTIONS } from './tokens'
import type { SentryOptions } from './types'

/**
 * Internal bootstrap service that calls `Sentry.init()` when the application
 * starts, if the `enabled` option is not `false`.
 *
 * @internal
 */
class SentryBootstrapService implements OnApplicationBootstrap {
  static inject = [SENTRY_OPTIONS, SENTRY_CLIENT] as const

  constructor(
    private readonly opts: SentryOptions,
    private readonly sentry: typeof import('@sentry/node'),
  ) {}

  onApplicationBootstrap(): void {
    if (this.opts.enabled === false) return

    this.sentry.init({
      dsn: this.opts.dsn,
      environment: this.opts.environment,
      tracesSampleRate: this.opts.tracesSampleRate ?? 0,
      release: this.opts.release,
    })
  }
}

/**
 * Module that initialises the Sentry SDK at application bootstrap and
 * provides the {@link SENTRY_CLIENT} and {@link SENTRY_OPTIONS} tokens.
 *
 * When `enabled: false` is passed the SDK is **not** initialised (useful in
 * test environments).
 *
 * @example
 * import { Module } from 'banhmi'
 * import { SentryModule } from '@banhmi/sentry'
 *
 * \@Module({
 *   imports: [
 *     SentryModule.forRoot({
 *       dsn: process.env.SENTRY_DSN!,
 *       environment: 'production',
 *       tracesSampleRate: 0.1,
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class SentryModule {
  /**
   * Create a configured Sentry module.
   *
   * @param opts - {@link SentryOptions} including the `dsn` and optional
   *   tracing/release fields.
   *
   * @example
   * SentryModule.forRoot({ dsn: 'https://key@sentry.io/123' })
   */
  static forRoot(opts: SentryOptions) {
    @Module({
      providers: [
        { provide: SENTRY_OPTIONS, useValue: opts },
        {
          provide: SENTRY_CLIENT,
          useFactory: () => {
            try {
              return require('@sentry/node')
            } catch {
              // @sentry/node is a peer dependency — return a no-op shim when
              // not installed (e.g. when enabled: false in test environments).
              return {
                init: () => {},
                captureException: () => '',
                startSpan: async (_ctx: unknown, fn: () => Promise<unknown>) =>
                  fn(),
              }
            }
          },
        },
        SentryBootstrapService,
      ],
      exports: [SENTRY_OPTIONS, SENTRY_CLIENT],
    })
    class SentryRootModule {}

    return SentryRootModule
  }
}
