import type { ThrottleConfig } from './types'

/**
 * Symbol key used to store class-level `@Throttle` configuration in
 * `Symbol.metadata`.
 *
 * @example
 * const config = (MyClass[Symbol.metadata] ?? {})[THROTTLE_METADATA_KEY]
 */
export const THROTTLE_METADATA_KEY: unique symbol = Symbol('banhmi:throttle')

/**
 * Symbol key used to store per-method `@Throttle` overrides as a
 * `Record<string, ThrottleConfig>` map in `Symbol.metadata`.
 *
 * @example
 * const map = (MyClass[Symbol.metadata] ?? {})[METHOD_THROTTLE_KEY]
 * const config = map?.myHandlerName
 */
export const METHOD_THROTTLE_KEY: unique symbol = Symbol(
  'banhmi:method_throttle',
)

/**
 * Symbol key used to store a class-level `@SkipThrottle` marker.
 *
 * @example
 * const skip = (MyClass[Symbol.metadata] ?? {})[SKIP_THROTTLE_KEY]
 */
export const SKIP_THROTTLE_KEY: unique symbol = Symbol('banhmi:skipThrottle')

/**
 * Symbol key used to store per-method `@SkipThrottle` markers as a
 * `Record<string, boolean>` map in `Symbol.metadata`.
 *
 * @example
 * const map = (MyClass[Symbol.metadata] ?? {})[METHOD_SKIP_THROTTLE_KEY]
 */
export const METHOD_SKIP_THROTTLE_KEY: unique symbol = Symbol(
  'banhmi:method_skipThrottle',
)

export type MethodThrottleMap = Record<string, ThrottleConfig>
export type MethodSkipThrottleMap = Record<string, boolean>
