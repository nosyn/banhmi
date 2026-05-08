import { Module } from '@banhmi/common'
import { CSRF_OPTIONS } from '../tokens'
import { CsrfMiddleware } from './csrf.middleware'

/**
 * Cookie options for the CSRF token cookie.
 *
 * @example
 * CsrfModule.forRoot({ cookie: { secure: true, sameSite: 'lax' } })
 */
export type CsrfCookieOptions = {
  /**
   * When `true`, sets the `Secure` attribute on the CSRF cookie.
   * Defaults to `false`.
   */
  secure?: boolean
  /**
   * `SameSite` attribute. Defaults to `'lax'`.
   */
  sameSite?: 'lax' | 'strict' | 'none'
  /**
   * When `true`, sets the `HttpOnly` attribute. Defaults to `false` so SPA
   * clients can read the cookie value via JavaScript.
   */
  httpOnly?: boolean
}

/**
 * Configuration options for the CSRF double-submit cookie module.
 *
 * @example
 * CsrfModule.forRoot({ cookieName: '_csrf', headerName: 'x-csrf-token' })
 */
export type CsrfOptions = {
  /**
   * Name of the CSRF cookie. Defaults to `'csrf-token'`.
   */
  cookieName?: string
  /**
   * Name of the request header carrying the CSRF token. Defaults to
   * `'x-csrf-token'`.
   */
  headerName?: string
  /**
   * Name of the form field carrying the CSRF token (for non-JSON bodies).
   * Defaults to `'_csrf'`.
   */
  formField?: string
  /**
   * Cookie serialization options for the CSRF token cookie.
   */
  cookie?: CsrfCookieOptions
}

/**
 * CSRF protection module using the double-submit cookie pattern.
 *
 * - On **safe** methods (`GET`, `HEAD`, `OPTIONS`): issues a `csrf-token`
 *   cookie if absent, and reflects the token value in the `x-csrf-token`
 *   response header for SPA convenience.
 * - On **unsafe** methods (`POST`, `PUT`, `PATCH`, `DELETE`): requires the
 *   cookie value to match the `x-csrf-token` request header (or `_csrf` form
 *   field). Mismatch → `403 { message: 'CSRF token mismatch' }`.
 *
 * @example
 * import { CsrfModule } from '@banhmi/security'
 *
 * \@Module({ imports: [CsrfModule.forRoot()] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class CsrfModule {
  /**
   * Create a configured CSRF module.
   *
   * @param opts - CSRF options. All keys are optional; sensible defaults
   *   are applied.
   * @returns A dynamically-created `@Module` that registers
   *   {@link CsrfMiddleware}.
   *
   * @example
   * CsrfModule.forRoot({ cookie: { secure: true } })
   */
  static forRoot(opts: CsrfOptions = {}) {
    @Module({
      providers: [{ provide: CSRF_OPTIONS, useValue: opts }, CsrfMiddleware],
    })
    class CsrfRootModule {}

    return CsrfRootModule
  }
}
