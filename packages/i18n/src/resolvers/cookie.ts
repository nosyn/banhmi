import type { LocaleResolver } from '../types'

/**
 * Options for {@link cookieResolver}.
 *
 * @example
 * cookieResolver({ cookieName: 'locale' })
 */
export type CookieResolverOptions = {
  /**
   * Cookie name to read the locale from.
   *
   * @defaultValue 'locale'
   */
  cookieName?: string
}

/**
 * Create a locale resolver that reads from a browser cookie.
 *
 * Parses the `Cookie` header directly (no external dep).
 *
 * @param opts - Options including `cookieName`.
 * @returns A {@link LocaleResolver}.
 *
 * @example
 * I18nModule.forRoot({
 *   resolvers: [CookieResolver, QueryResolver],
 * })
 */
export function cookieResolver(
  opts: CookieResolverOptions = {},
): LocaleResolver {
  const name = opts.cookieName ?? 'locale'
  return {
    resolve(ctx) {
      const header = ctx.headers.get('cookie')
      if (!header) return null
      for (const pair of header.split(';')) {
        const [k, v] = pair.split('=')
        if (k?.trim() === name) {
          return v?.trim() ?? null
        }
      }
      return null
    },
  }
}

/**
 * Default cookie resolver using `locale` as the cookie name.
 *
 * @example
 * I18nModule.forRoot({ resolvers: [CookieResolver] })
 */
export const CookieResolver = cookieResolver()
