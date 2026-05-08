import type { RouteCtx } from '@banhmi/common'
import { I18N_OPTIONS_TOKEN } from './tokens'
import type { I18nOptions, Translations } from './types'

/**
 * Service that provides translation and locale resolution.
 *
 * Translations are dot-path navigated (e.g. `'errors.notFound'`) and support
 * `{varname}` interpolation.
 *
 * Pass a `RouteCtx` to `t()` to auto-resolve the locale from the request,
 * or pass an explicit `locale` string as the third argument.
 *
 * @example
 * \@Injectable()
 * class MyController {
 *   static inject = [I18nService] as const
 *   constructor(private i18n: I18nService) {}
 *
 *   \@Get('/')
 *   greet(ctx: RouteCtx) {
 *     return { message: this.i18n.t('greeting', { name: 'world' }, ctx) }
 *   }
 * }
 */
export class I18nService {
  static inject = [I18N_OPTIONS_TOKEN] as const

  /** Lazily-loaded translation cache per locale. */
  private cache: Map<string, Translations> = new Map()

  constructor(private readonly opts: I18nOptions) {
    // Pre-load inline translations into cache
    if (opts.translations) {
      for (const [locale, translations] of Object.entries(opts.translations)) {
        this.cache.set(locale, translations)
      }
    }
  }

  /**
   * Translate a dot-path key, optionally with variable interpolation.
   *
   * The locale is resolved in this order:
   * 1. Explicit `locale` argument (if passed as a string).
   * 2. Resolvers from `I18nOptions.resolvers` (tried in order), using `ctx`.
   * 3. `I18nOptions.fallbackLocale`.
   *
   * @param key - Dot-path translation key (e.g. `'errors.notFound'`).
   * @param args - Interpolation variables. Replaces `{varname}` in the string.
   * @param ctxOrLocale - Route context for resolver-based locale detection,
   *   or an explicit locale string.
   * @returns Translated string, or `key` if the translation is not found.
   *
   * @example
   * i18n.t('greeting', { name: 'world' }, ctx) // 'Hello, world!'
   * i18n.t('errors.notFound', {}, 'fr')         // 'Page introuvable'
   */
  t(
    key: string,
    args: Record<string, unknown> = {},
    ctxOrLocale?: RouteCtx | string,
  ): string {
    const locale = this.resolveLocale(ctxOrLocale)
    const translations = this.getTranslations(locale)
    const value = this.lookup(translations, key)

    if (value === undefined) {
      // Fallback: try fallback locale if different from requested
      if (locale !== this.opts.fallbackLocale) {
        const fallbackTranslations = this.getTranslations(
          this.opts.fallbackLocale,
        )
        const fallbackValue = this.lookup(fallbackTranslations, key)
        if (fallbackValue !== undefined) {
          return this.interpolate(fallbackValue, args)
        }
      }
      // Return the key itself when not found
      return key
    }

    return this.interpolate(value, args)
  }

  /**
   * Resolve the locale to use for a translation call.
   *
   * @param ctxOrLocale - Optional route context or explicit locale string.
   * @returns Resolved locale string.
   *
   * @internal
   */
  resolveLocale(ctxOrLocale?: RouteCtx | string): string {
    if (typeof ctxOrLocale === 'string') return ctxOrLocale
    if (ctxOrLocale) {
      for (const resolver of this.opts.resolvers) {
        const locale = resolver.resolve(ctxOrLocale)
        if (locale) return locale
      }
    }
    return this.opts.fallbackLocale
  }

  private getTranslations(locale: string): Translations {
    return this.cache.get(locale) ?? {}
  }

  private lookup(translations: Translations, key: string): string | undefined {
    const parts = key.split('.')
    let current: string | Translations = translations

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return undefined
      const next = current[part]
      if (next === undefined) return undefined
      current = next
    }

    if (typeof current === 'string') return current
    return undefined
  }

  private interpolate(template: string, args: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
      const val = args[key]
      return val !== undefined ? String(val) : `{${key}}`
    })
  }
}
