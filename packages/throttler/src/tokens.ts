import { Token } from '@banhmi/common'
import type { ThrottlerOptions } from './types'

/**
 * DI token for {@link ThrottlerOptions} registered by
 * {@link ThrottlerModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [THROTTLER_OPTIONS] as const
 *   constructor(private opts: ThrottlerOptions) {}
 * }
 */
export const THROTTLER_OPTIONS = Token<ThrottlerOptions>('THROTTLER_OPTIONS')
