import { Token } from '@banhmi/common'
import type { StaticOptions } from './static.module'

/**
 * DI token for the {@link StaticOptions} configuration object.
 *
 * Inject this to read the resolved static-serving configuration from
 * within the module.
 *
 * @example
 * class MyService {
 *   static inject = [STATIC_OPTIONS] as const
 *   constructor(private opts: StaticOptions) {}
 * }
 */
export const STATIC_OPTIONS = Token<StaticOptions>('STATIC_OPTIONS')
