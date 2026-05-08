import type { RouteCtx } from '@banhmi/common'
import { parseCookies } from './parse'
import { verifyValue } from './sign'

// State keys used to pass resolved cookie data to the handler
/** @internal */
export const COOKIES_STATE_KEY = 'banhmi:cookies:all'
/** @internal */
export const COOKIE_STATE_PREFIX = 'banhmi:cookies:cookie:'
/** @internal */
export const SIGNED_COOKIE_STATE_PREFIX = 'banhmi:cookies:signed:'

type Handler = (ctx: RouteCtx, ...args: unknown[]) => unknown

/**
 * Method decorator that injects all parsed cookies into `ctx.state` before
 * the handler runs. Use {@link getCookies} inside the handler to retrieve them.
 *
 * The decorator wraps the method at class-definition time so it works
 * correctly regardless of how the class is instantiated.
 *
 * @example
 * \@Controller()
 * class MyController {
 *   \@Get('/me')
 *   \@Cookies()
 *   me(ctx: RouteCtx) {
 *     const cookies = getCookies(ctx)
 *     return { uid: cookies['uid'] }
 *   }
 * }
 */
export function Cookies() {
  return (
    original: Handler,
    _context: ClassMethodDecoratorContext,
  ): Handler => {
    return async function (this: unknown, ctx: RouteCtx, ...rest: unknown[]) {
      ctx.state[COOKIES_STATE_KEY] = parseCookies(
        ctx.headers.get('cookie') ?? '',
      )
      return original.call(this, ctx, ...rest)
    }
  }
}

/**
 * Method decorator that injects a single cookie value into `ctx.state`.
 * Use {@link getCookie}`(ctx, name)` inside the handler to retrieve the value.
 *
 * @param name - Cookie name to extract.
 *
 * @example
 * \@Controller()
 * class MyController {
 *   \@Get('/me')
 *   \@Cookie('uid')
 *   me(ctx: RouteCtx) {
 *     const uid = getCookie(ctx, 'uid') // string | undefined
 *     return { uid }
 *   }
 * }
 */
export function Cookie(name: string) {
  return (
    original: Handler,
    _context: ClassMethodDecoratorContext,
  ): Handler => {
    return async function (this: unknown, ctx: RouteCtx, ...rest: unknown[]) {
      const cookies = parseCookies(ctx.headers.get('cookie') ?? '')
      ctx.state[`${COOKIE_STATE_PREFIX}${name}`] = cookies[name]
      return original.call(this, ctx, ...rest)
    }
  }
}

/**
 * Method decorator that verifies and injects a signed cookie value into
 * `ctx.state` before the handler runs. Use {@link getSignedCookie} inside
 * the handler to retrieve the verified value.
 *
 * Verification is async and completes before the handler is invoked.
 *
 * @param name - Signed cookie name to extract and verify.
 * @param secretOrFn - HMAC secret string, or a function returning the secret.
 *   When omitted, falls back to `Bun.env.BANHMI_COOKIE_SECRET`.
 *
 * @example
 * \@Controller()
 * class MyController {
 *   \@Get('/me')
 *   \@SignedCookie('uid', 'my-secret')
 *   me(ctx: RouteCtx) {
 *     const uid = getSignedCookie(ctx, 'uid') // string | null
 *     return { uid }
 *   }
 * }
 */
export function SignedCookie(
  name: string,
  secretOrFn?: string | (() => string | Promise<string>),
) {
  return (
    original: Handler,
    _context: ClassMethodDecoratorContext,
  ): Handler => {
    return async function (this: unknown, ctx: RouteCtx, ...rest: unknown[]) {
      const secret =
        typeof secretOrFn === 'function'
          ? await secretOrFn()
          : (secretOrFn ?? Bun.env.BANHMI_COOKIE_SECRET ?? '')

      const cookies = parseCookies(ctx.headers.get('cookie') ?? '')
      const raw = cookies[name]
      const verified = raw !== undefined ? await verifyValue(raw, secret) : null
      ctx.state[`${SIGNED_COOKIE_STATE_PREFIX}${name}`] = verified
      return original.call(this, ctx, ...rest)
    }
  }
}

/**
 * Retrieve all parsed cookies injected by the `@Cookies()` decorator.
 *
 * @param ctx - The route context.
 * @returns The `ParsedCookies` map, or an empty object if `@Cookies()` was
 *   not applied.
 *
 * @example
 * const all = getCookies(ctx)
 * console.log(all['uid'])
 */
export function getCookies(ctx: RouteCtx): Record<string, string> {
  return (
    (ctx.state[COOKIES_STATE_KEY] as Record<string, string> | undefined) ?? {}
  )
}

/**
 * Retrieve a single cookie value injected by the `@Cookie(name)` decorator.
 *
 * @param ctx - The route context.
 * @param name - Cookie name.
 * @returns The cookie value string, or `undefined` if not present.
 *
 * @example
 * const uid = getCookie(ctx, 'uid')
 */
export function getCookie(ctx: RouteCtx, name: string): string | undefined {
  return ctx.state[`${COOKIE_STATE_PREFIX}${name}`] as string | undefined
}

/**
 * Retrieve the verified value of a signed cookie injected by
 * `@SignedCookie(name)`.
 *
 * @param ctx - The route context.
 * @param name - Signed cookie name.
 * @returns The verified plain value, or `null` if the signature failed or the
 *   cookie was absent.
 *
 * @example
 * const uid = getSignedCookie(ctx, 'uid')
 */
export function getSignedCookie(ctx: RouteCtx, name: string): string | null {
  const val = ctx.state[`${SIGNED_COOKIE_STATE_PREFIX}${name}`]
  if (val === undefined) return null
  return val as string | null
}
