import { Token } from '@banhmi/common'
import type { VersioningOptions } from './versioning.module'

/**
 * Symbol used to store version metadata on a controller class or handler method.
 *
 * Written by `@Version` and read by the platform adapter during route matching.
 *
 * @example
 * // Reading version from a class:
 * const version = (MyController[Symbol.metadata] ?? {})[VERSION_METADATA]
 */
export const VERSION_METADATA = Symbol('banhmi:version')

/**
 * DI token for the {@link VersioningOptions} configuration object.
 *
 * @example
 * class MyService {
 *   static inject = [VERSIONING_OPTIONS] as const
 *   constructor(private opts: VersioningOptions) {}
 * }
 */
export const VERSIONING_OPTIONS = Token<VersioningOptions>('VERSIONING_OPTIONS')
