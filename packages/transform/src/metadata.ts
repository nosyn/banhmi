/**
 * Symbol key used to store transform metadata on a class via TC39 Stage 3
 * decorator context. Read at runtime with:
 *
 * ```ts
 * const meta = (Cls[Symbol.metadata] ?? {})[TRANSFORM_METADATA]
 * ```
 */
export const TRANSFORM_METADATA = Symbol('banhmi:transform')

/**
 * Per-property transform descriptor stored inside `[TRANSFORM_METADATA]`.
 *
 * Multiple decorators may be applied to the same property; each decorator
 * merges its fields into the existing descriptor for that key.
 */
export type PropertyMeta = {
  /** Serialised name override from `@Expose({ name })`. */
  exposedName?: string
  /** Explicit groups that must match for this field to be included. */
  groups?: string[]
  /**
   * `true` when `@Expose()` is present — the field is opt-in when the
   * whole class is running in exclude-mode, or opt-out when not.
   */
  exposed?: boolean
  /**
   * `true` when `@Exclude()` is present — the field is always dropped
   * unless also `@Expose()`-d (which does not make sense and is user error).
   */
  excluded?: boolean
  /** Custom transform function applied during serialisation. */
  transformFn?: (value: unknown, instance: object) => unknown
  /** Constructor to use for recursive serialisation of nested objects. */
  typeFn?: () => new () => unknown
}

/**
 * The `[TRANSFORM_METADATA]` value stored on `Class[Symbol.metadata]`.
 * Keys are property names; values are the per-property descriptors.
 */
export type TransformMap = Record<string, PropertyMeta>
