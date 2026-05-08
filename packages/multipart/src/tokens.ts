import { Token } from '@banhmi/common'

/**
 * DI token for the {@link MultipartOptions} configuration object.
 *
 * Registered by {@link MultipartModule.forRoot}.
 *
 * @example
 * class MyController {
 *   static inject = [MULTIPART_OPTIONS] as const
 *   constructor(private opts: MultipartOptions) {}
 * }
 */
export const MULTIPART_OPTIONS =
  Token<import('./types').MultipartOptions>('MULTIPART_OPTIONS')
