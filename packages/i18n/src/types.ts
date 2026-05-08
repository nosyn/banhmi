import type { RouteCtx } from '@banhmi/common'

/**
 * A nested translation map. Values are strings or nested `Translations` maps.
 *
 * @example
 * {
 *   greeting: 'Hello, {name}!',
 *   errors: {
 *     notFound: 'Not found',
 *     forbidden: 'Forbidden',
 *   },
 * }
 */
export type Translations = Record<string, string | Translations>

/**
 * A locale resolver that extracts the desired locale from a route context.
 *
 * Resolvers are tried in order; the first non-null result wins.
 *
 * @example
 * const myResolver: LocaleResolver = {
 *   resolve: (ctx) => ctx.query.get('locale'),
 * }
 */
export type LocaleResolver = {
  /**
   * Attempt to resolve the locale from the given request context.
   *
   * @param ctx - The incoming route context.
   * @returns The resolved locale string, or `null` if this resolver cannot determine it.
   */
  resolve(ctx: RouteCtx): string | null
}

/**
 * Configuration options for {@link I18nModule.forRoot}.
 *
 * @example
 * I18nModule.forRoot({
 *   fallbackLocale: 'en',
 *   resolvers: [HeaderResolver, QueryResolver],
 *   translations: {
 *     en: { greeting: 'Hello, {name}!' },
 *     fr: { greeting: 'Bonjour, {name}!' },
 *   },
 * })
 */
export type I18nOptions = {
  /**
   * Locale used when no resolver can determine the request locale,
   * or when the resolved locale has no translations.
   */
  fallbackLocale: string
  /**
   * Ordered list of locale resolvers tried per request.
   * First non-null result wins.
   */
  resolvers: LocaleResolver[]
  /**
   * Directory containing `<locale>.json` translation files.
   * Loaded lazily on first use.
   */
  loaderPath?: string
  /**
   * Inline translation map keyed by locale.
   */
  translations?: Record<string, Translations>
}
