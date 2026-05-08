import { Module } from '@banhmi/common'
import { CORS_OPTIONS } from '../tokens'
import { CorsMiddleware } from './cors.middleware'

/**
 * Configuration options for CORS.
 *
 * @example
 * CorsModule.forRoot({
 *   origin: 'https://app.example.com',
 *   credentials: true,
 * })
 */
export type CorsOptions = {
  /**
   * Allowed origin(s). Accepts a string, array of strings, a `RegExp`, or
   * a predicate function `(origin: string) => boolean`. Defaults to `'*'`
   * (allow all).
   */
  origin?: string | string[] | RegExp | ((origin: string) => boolean)
  /**
   * When `true`, sets `Access-Control-Allow-Credentials: true`.
   */
  credentials?: boolean
  /**
   * Allowed HTTP methods. Defaults to `GET, POST, PUT, DELETE, PATCH,
   * OPTIONS, HEAD`.
   */
  methods?: string[]
  /**
   * Explicitly allowed request headers. When not set, the middleware mirrors
   * the value of `Access-Control-Request-Headers` from the preflight request.
   */
  allowedHeaders?: string[]
  /**
   * Headers to expose to browser JavaScript via
   * `Access-Control-Expose-Headers`.
   */
  exposedHeaders?: string[]
  /**
   * Preflight cache duration in seconds (`Access-Control-Max-Age`).
   * Default `5`.
   */
  maxAge?: number
}

/**
 * Cross-Origin Resource Sharing (CORS) module.
 *
 * Call {@link CorsModule.forRoot} to register the middleware that handles
 * CORS preflight (`OPTIONS`) requests and sets the appropriate
 * `Access-Control-*` response headers on all requests.
 *
 * @example
 * import { CorsModule } from '@banhmi/security'
 *
 * \@Module({ imports: [CorsModule.forRoot({ origin: 'https://app.example.com' })] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class CorsModule {
  /**
   * Create a configured CORS module.
   *
   * @param opts - CORS options. When `origin` is omitted, all origins are
   *   allowed (`'*'`).
   * @returns A dynamically-created `@Module` that registers
   *   {@link CorsMiddleware}.
   *
   * @example
   * CorsModule.forRoot({ origin: ['https://a.com', 'https://b.com'] })
   */
  static forRoot(opts: CorsOptions = {}) {
    @Module({
      providers: [{ provide: CORS_OPTIONS, useValue: opts }, CorsMiddleware],
    })
    class CorsRootModule {}

    return CorsRootModule
  }
}
