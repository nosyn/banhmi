import { Token } from '@banhmi/common'
import type { CompressionOptions } from './compression.module'

/**
 * DI token for the {@link CompressionOptions} configuration object.
 *
 * Inject this to read the resolved compression configuration from within
 * the module.
 *
 * @example
 * class MyService {
 *   static inject = [COMPRESSION_OPTIONS] as const
 *   constructor(private opts: CompressionOptions) {}
 * }
 */
export const COMPRESSION_OPTIONS = Token<CompressionOptions>(
  'COMPRESSION_OPTIONS',
)
