import { Token } from '@banhmi/common'
import type { SessionOptions } from './types'

/**
 * DI token for the {@link SessionOptions} configuration object.
 *
 * Registered by {@link SessionModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [SESSION_OPTIONS] as const
 *   constructor(private opts: SessionOptions) {}
 * }
 */
export const SESSION_OPTIONS = Token<SessionOptions>('SESSION_OPTIONS')
