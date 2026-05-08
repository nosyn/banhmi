/**
 * Options passed to {@link SentryModule.forRoot}.
 *
 * @example
 * SentryModule.forRoot({
 *   dsn: 'https://abc123@sentry.io/1',
 *   environment: 'production',
 *   tracesSampleRate: 0.1,
 * })
 */
export type SentryOptions = {
  /** Sentry Data Source Name. */
  dsn: string
  /**
   * Sentry environment tag (e.g. `'production'`, `'staging'`).
   * Defaults to `Bun.env.NODE_ENV` when not set.
   */
  environment?: string
  /**
   * Fraction of transactions to record for performance monitoring.
   * A value of `0` (the default) disables tracing.
   *
   * @defaultValue 0
   */
  tracesSampleRate?: number
  /** Release identifier string, e.g. a git commit SHA or semver tag. */
  release?: string
  /**
   * Set to `false` to skip SDK initialization entirely (useful in tests or
   * development environments where you don't want real errors reported).
   *
   * @defaultValue true
   */
  enabled?: boolean
}
