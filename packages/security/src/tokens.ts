import { Token } from '@banhmi/common'
import type { CorsOptions } from './cors/cors.module'
import type { CsrfOptions } from './csrf/csrf.module'
import type { HelmetOptions } from './helmet/helmet.module'

/**
 * DI token for {@link HelmetOptions}.
 *
 * @example
 * class MyService {
 *   static inject = [HELMET_OPTIONS] as const
 *   constructor(private opts: HelmetOptions) {}
 * }
 */
export const HELMET_OPTIONS = Token<HelmetOptions>('HELMET_OPTIONS')

/**
 * DI token for {@link CorsOptions}.
 *
 * @example
 * class MyService {
 *   static inject = [CORS_OPTIONS] as const
 *   constructor(private opts: CorsOptions) {}
 * }
 */
export const CORS_OPTIONS = Token<CorsOptions>('CORS_OPTIONS')

/**
 * DI token for {@link CsrfOptions}.
 *
 * @example
 * class MyService {
 *   static inject = [CSRF_OPTIONS] as const
 *   constructor(private opts: CsrfOptions) {}
 * }
 */
export const CSRF_OPTIONS = Token<CsrfOptions>('CSRF_OPTIONS')
