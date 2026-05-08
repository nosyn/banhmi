import { Token } from '@banhmi/common'
import type { I18nOptions } from './types'

/**
 * DI token for the {@link I18nOptions} registered by `I18nModule.forRoot()`.
 *
 * @example
 * class MyService {
 *   static inject = [I18N_OPTIONS_TOKEN] as const
 *   constructor(private opts: I18nOptions) {}
 * }
 */
export const I18N_OPTIONS_TOKEN = Token<I18nOptions>('I18N_OPTIONS')
