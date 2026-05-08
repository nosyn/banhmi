/**
 * @banhmi/i18n — Internationalization with header/query/cookie locale resolvers.
 *
 * Provides `I18nModule.forRoot()` to configure locale resolution and
 * translations, and `I18nService.t()` for translating dot-path keys with
 * `{variable}` interpolation.
 *
 * @example
 * import { I18nModule, I18nService, HeaderResolver } from '@banhmi/i18n'
 *
 * \@Module({
 *   imports: [
 *     I18nModule.forRoot({
 *       fallbackLocale: 'en',
 *       resolvers: [HeaderResolver],
 *       translations: {
 *         en: { greeting: 'Hello, {name}!' },
 *         fr: { greeting: 'Bonjour, {name}!' },
 *       },
 *     }),
 *   ],
 * })
 * class AppModule {}
 */

export { I18nModule } from './i18n.module'
export { I18nService } from './i18n.service'
export {
  CookieResolver,
  type CookieResolverOptions,
  cookieResolver,
} from './resolvers/cookie'
export { HeaderResolver } from './resolvers/header'
export {
  QueryResolver,
  type QueryResolverOptions,
  queryResolver,
} from './resolvers/query'
export { I18N_OPTIONS_TOKEN } from './tokens'
export type { I18nOptions, LocaleResolver, Translations } from './types'
