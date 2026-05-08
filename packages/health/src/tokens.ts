import { Token } from '@banhmi/common'
import type { HealthOptions } from './types'

/**
 * DI token for the {@link HealthOptions} registered by `HealthModule.forRoot()`.
 *
 * @example
 * class MyService {
 *   static inject = [HEALTH_OPTIONS_TOKEN] as const
 *   constructor(private opts: HealthOptions) {}
 * }
 */
export const HEALTH_OPTIONS_TOKEN = Token<HealthOptions>('HEALTH_OPTIONS')
