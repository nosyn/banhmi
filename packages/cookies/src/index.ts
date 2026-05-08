/**
 * @banhmi/cookies — Cookie parsing, signing, and decorator helpers for Banhmi.
 *
 * Provides pure-function cookie utilities (`parseCookies`, `serializeCookie`,
 * `signValue`, `verifyValue`) as well as method decorators (`@Cookies`,
 * `@Cookie`, `@SignedCookie`) that pre-extract cookie values into `ctx.state`
 * before the handler runs.
 *
 * @example
 * import { Cookie, SignedCookie, getCookie, getSignedCookie } from '@banhmi/cookies'
 *
 * \@Controller()
 * class AuthController {
 *   \@Get('/me')
 *   \@Cookie('uid')
 *   me(ctx: RouteCtx) {
 *     return { uid: getCookie(ctx, 'uid') }
 *   }
 * }
 */

export {
  Cookie,
  Cookies,
  getCookie,
  getCookies,
  getSignedCookie,
  SignedCookie,
} from './cookies.decorators'
export type { CookiesOptions } from './cookies.module'
export { CookiesModule } from './cookies.module'
export type { CookieOptions, ParsedCookies } from './parse'
export { parseCookies, serializeCookie } from './parse'
export { signValue, verifyValue } from './sign'
export { COOKIE_SECRET } from './tokens'
