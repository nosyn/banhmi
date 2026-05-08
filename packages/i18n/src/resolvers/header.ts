import type { LocaleResolver } from '../types'

/**
 * Locale resolver that reads from the `Accept-Language` HTTP header.
 *
 * Extracts the primary locale tag (e.g. `'en-US'` → `'en-US'`). Only
 * the first language in the header is considered.
 *
 * @example
 * I18nModule.forRoot({
 *   resolvers: [HeaderResolver],
 * })
 */
export const HeaderResolver: LocaleResolver = {
  resolve(ctx) {
    const header = ctx.headers.get('accept-language')
    if (!header) return null
    // Take the first locale (before comma or semicolon)
    const first = header.split(',')[0]?.split(';')[0]?.trim()
    return first ?? null
  },
}
