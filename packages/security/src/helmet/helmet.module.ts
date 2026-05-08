import { Module } from '@banhmi/common'
import { HELMET_OPTIONS } from '../tokens'
import { HelmetMiddleware } from './helmet.middleware'

/**
 * Per-header configuration for Helmet. Each key matches an HTTP security
 * header name. Setting a key to a string overrides the default value; setting
 * it to `false` omits that header entirely.
 *
 * @example
 * HelmetModule.forRoot({
 *   'X-Frame-Options': 'DENY',
 *   'Permissions-Policy': false,
 * })
 */
export type HelmetOptions = {
  /** Override or disable `Content-Security-Policy`. Default: `"default-src 'self'"`. */
  'Content-Security-Policy'?: string | false
  /** Override or disable `Strict-Transport-Security`. Default: `'max-age=15552000; includeSubDomains'`. */
  'Strict-Transport-Security'?: string | false
  /** Override or disable `X-Content-Type-Options`. Default: `'nosniff'`. */
  'X-Content-Type-Options'?: string | false
  /** Override or disable `X-Frame-Options`. Default: `'SAMEORIGIN'`. */
  'X-Frame-Options'?: string | false
  /** Override or disable `Referrer-Policy`. Default: `'no-referrer'`. */
  'Referrer-Policy'?: string | false
  /** Override or disable `Permissions-Policy`. Default: `''` (empty). */
  'Permissions-Policy'?: string | false
  /** Override or disable `X-Download-Options`. Default: `'noopen'`. */
  'X-Download-Options'?: string | false
  /** Override or disable `X-DNS-Prefetch-Control`. Default: `'off'`. */
  'X-DNS-Prefetch-Control'?: string | false
}

/**
 * HTTP security headers module (Helmet).
 *
 * Call {@link HelmetModule.forRoot} to register the middleware that appends
 * security headers to every response. Each header can be customised or
 * disabled individually via {@link HelmetOptions}.
 *
 * @example
 * import { HelmetModule } from '@banhmi/security'
 *
 * \@Module({ imports: [HelmetModule.forRoot()] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class HelmetModule {
  /**
   * Create a configured Helmet module. Headers default to OWASP-recommended
   * values; pass a string to override a header, `false` to omit it.
   *
   * @param opts - Per-header overrides. All keys are optional.
   * @returns A dynamically-created `@Module` that registers
   *   {@link HelmetMiddleware}.
   *
   * @example
   * HelmetModule.forRoot({ 'X-Frame-Options': 'DENY' })
   */
  static forRoot(opts: HelmetOptions = {}) {
    @Module({
      providers: [
        { provide: HELMET_OPTIONS, useValue: opts },
        HelmetMiddleware,
      ],
    })
    class HelmetRootModule {}

    return HelmetRootModule
  }
}
