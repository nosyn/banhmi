import { Module } from '@banhmi/common'
import { I18nService } from './i18n.service'
import { I18N_OPTIONS_TOKEN } from './tokens'
import type { I18nOptions } from './types'

/**
 * Module that registers the {@link I18nService} for translation.
 *
 * Call {@link I18nModule.forRoot} with your locale resolvers and translations
 * to enable internationalization.
 *
 * @example
 * import { I18nModule, HeaderResolver, QueryResolver } from '@banhmi/i18n'
 *
 * \@Module({
 *   imports: [
 *     I18nModule.forRoot({
 *       fallbackLocale: 'en',
 *       resolvers: [HeaderResolver, QueryResolver],
 *       translations: {
 *         en: { greeting: 'Hello, {name}!' },
 *         fr: { greeting: 'Bonjour, {name}!' },
 *       },
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class I18nModule {
  /**
   * Create a configured i18n module.
   *
   * @param opts - Options including resolvers and translations.
   * @returns A dynamically-created `@Module`.
   *
   * @example
   * I18nModule.forRoot({ fallbackLocale: 'en', resolvers: [HeaderResolver] })
   */
  static forRoot(opts: I18nOptions) {
    @Module({
      providers: [{ provide: I18N_OPTIONS_TOKEN, useValue: opts }, I18nService],
      exports: [I18nService],
    })
    class I18nRootModule {}

    return I18nRootModule
  }
}
