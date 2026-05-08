import { Token } from '@banhmi/common'

/**
 * DI token for the HMAC signing secret used by {@link SignedCookie}.
 *
 * Registered by {@link CookiesModule.forRoot} when a `secret` option is
 * provided. Falls back to `Bun.env.BANHMI_COOKIE_SECRET` at runtime.
 *
 * @example
 * class MyService {
 *   static inject = [COOKIE_SECRET] as const
 *   constructor(private secret: string) {}
 * }
 */
export const COOKIE_SECRET = Token<string>('COOKIE_SECRET')
