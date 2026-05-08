import { Token } from '@banhmi/common'
import type { Logger } from './logger'
import type { LoggerOptions } from './types'

/**
 * DI token for the {@link LoggerOptions} registered by
 * {@link LoggerModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [LOGGER_OPTIONS] as const
 *   constructor(private opts: LoggerOptions) {}
 * }
 */
export const LOGGER_OPTIONS = Token<LoggerOptions>('LOGGER_OPTIONS')

/**
 * DI token for the root {@link Logger} instance registered by
 * {@link LoggerModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [ROOT_LOGGER] as const
 *   constructor(private logger: Logger) {}
 * }
 */
export const ROOT_LOGGER = Token<Logger>('ROOT_LOGGER')
