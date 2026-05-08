import { Module } from '@banhmi/common'
import { COOKIE_SECRET } from './tokens'

/**
 * Configuration options for {@link CookiesModule.forRoot}.
 *
 * @example
 * CookiesModule.forRoot({ secret: 'my-signing-secret' })
 */
export type CookiesOptions = {
  /**
   * HMAC-SHA256 signing secret used by `@SignedCookie` decorators and
   * {@link signValue} / {@link verifyValue}. Falls back to the
   * `BANHMI_COOKIE_SECRET` environment variable when not specified.
   */
  secret?: string
}

/**
 * Cookie utility module.
 *
 * Call {@link CookiesModule.forRoot} to register the {@link COOKIE_SECRET}
 * DI token. The secret is used by `@SignedCookie` decorators for HMAC-SHA256
 * signing. When `secret` is omitted it falls back to the
 * `BANHMI_COOKIE_SECRET` environment variable at runtime.
 *
 * The `parseCookies`, `serializeCookie`, `signValue`, and `verifyValue`
 * functions are pure utilities and do not require module registration.
 *
 * @example
 * import { CookiesModule } from '@banhmi/cookies'
 *
 * \@Module({ imports: [CookiesModule.forRoot({ secret: 'my-secret' })] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class CookiesModule {
  /**
   * Create a configured cookies module that registers the signing secret.
   *
   * @param opts - Options. `secret` defaults to `Bun.env.BANHMI_COOKIE_SECRET`.
   * @returns A dynamically-created `@Module` that registers the
   *   {@link COOKIE_SECRET} token.
   *
   * @example
   * CookiesModule.forRoot({ secret: process.env.COOKIE_SECRET })
   */
  static forRoot(opts: CookiesOptions = {}) {
    const secret = opts.secret ?? Bun.env.BANHMI_COOKIE_SECRET ?? ''

    @Module({
      providers: [
        {
          provide: COOKIE_SECRET,
          useValue: secret,
        },
      ],
      exports: [COOKIE_SECRET],
    })
    class CookiesRootModule {}

    return CookiesRootModule
  }
}
