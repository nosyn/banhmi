import type { LocaleResolver } from '../types'

/**
 * Options for {@link QueryResolver}.
 *
 * @example
 * queryResolver({ paramName: 'locale' })
 */
export type QueryResolverOptions = {
  /**
   * Query parameter name to read the locale from.
   *
   * @defaultValue 'lang'
   */
  paramName?: string
}

/**
 * Create a locale resolver that reads from a URL query parameter.
 *
 * @param opts - Options. Defaults to reading from `?lang=`.
 * @returns A {@link LocaleResolver}.
 *
 * @example
 * I18nModule.forRoot({
 *   resolvers: [QueryResolver],
 * })
 */
export const QueryResolver: LocaleResolver = {
  resolve(ctx) {
    return ctx.query.get('lang') ?? null
  },
}

/**
 * Factory that creates a query locale resolver with a custom parameter name.
 *
 * @param opts - Options including `paramName`.
 * @returns A {@link LocaleResolver}.
 *
 * @example
 * queryResolver({ paramName: 'locale' })
 */
export function queryResolver(opts: QueryResolverOptions = {}): LocaleResolver {
  const param = opts.paramName ?? 'lang'
  return {
    resolve(ctx) {
      return ctx.query.get(param) ?? null
    },
  }
}
