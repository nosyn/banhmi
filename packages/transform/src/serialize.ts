import type { TransformOptions } from './decorators'
import { groupMatches } from './groups'
import type { TransformMap } from './metadata'
import { TRANSFORM_METADATA } from './metadata'

/**
 * Serialize `input` as an instance of `dto`, respecting `@Expose`,
 * `@Exclude`, `@Transform`, and `@Type` decorator metadata.
 *
 * Behaviour:
 * - Properties with **no decorator** are included by default.
 * - `@Exclude()` drops the property.
 * - `@Expose({ name })` renames the output key.
 * - `@Expose({ groups })` restricts the property to those groups; it is
 *   omitted when `opts.groups` has no intersection.
 * - `@Transform(fn)` runs `fn(value, instance)` and uses its return value.
 * - `@Type(() => Cls)` recurses into the value (or each element if array).
 *
 * @example
 * class UserDto {
 *   \@Exclude()
 *   password: string
 *
 *   \@Expose({ groups: ['admin'] })
 *   email: string
 *
 *   name: string
 * }
 *
 * serialize(user, UserDto) // { name: 'mochi' }
 * serialize(user, UserDto, { groups: ['admin'] }) // { email: '...', name: 'mochi' }
 */
export function serialize<T extends object>(
  input: T,
  dto: new () => T,
  opts: TransformOptions = {},
): unknown {
  return serializeValue(input, dto, opts.groups)
}

/**
 * Deserialise a plain object into an instance of `dto`.
 *
 * This is a minimal implementation: it copies each key from `plain` onto a
 * freshly instantiated `dto` object without type coercion. Extend in a future
 * wave to respect `@Type` for proper nested instantiation.
 *
 * @example
 * const dto = deserialize({ name: 'mochi' }, UserDto)
 */
export function deserialize<T extends object>(
  plain: unknown,
  dto: new () => T,
): T {
  const instance = new dto()
  if (plain !== null && typeof plain === 'object' && !Array.isArray(plain)) {
    const record = plain as Record<string, unknown>
    for (const key of Object.keys(record)) {
      ;(instance as Record<string, unknown>)[key] = record[key]
    }
  }
  return instance
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function readTransformMap(ctor: new () => unknown): TransformMap {
  const symbolMeta = ctor[Symbol.metadata]
  if (!symbolMeta) return {}
  return (
    ((symbolMeta as Record<symbol, unknown>)[
      TRANSFORM_METADATA
    ] as TransformMap) ?? {}
  )
}

function serializeValue(
  input: unknown,
  ctor: new () => unknown,
  activeGroups: string[] | undefined,
): unknown {
  if (input === null || input === undefined) return input
  if (Array.isArray(input)) {
    return input.map((item) => serializeValue(item, ctor, activeGroups))
  }
  if (typeof input !== 'object') return input

  const record = input as Record<string, unknown>
  const map = readTransformMap(ctor)
  const result: Record<string, unknown> = {}

  // Collect all property keys from the instance (own enumerable)
  const keys = Object.keys(record)

  for (const key of keys) {
    const meta = map[key]

    // @Exclude — always drop
    if (meta?.excluded) continue

    // Group check — only applies when @Expose({ groups }) is set
    if (meta?.exposed && meta.groups && meta.groups.length > 0) {
      if (!groupMatches(meta.groups, activeGroups)) continue
    }

    const rawValue = record[key]

    // @Transform — apply custom fn
    let value: unknown
    if (meta?.transformFn) {
      value = meta.transformFn(rawValue, input as object)
    } else {
      value = rawValue
    }

    // @Type — recurse into nested DTO
    if (meta?.typeFn) {
      const nestedCtor = meta.typeFn()
      if (Array.isArray(value)) {
        value = value.map((item) =>
          serializeValue(item, nestedCtor, activeGroups),
        )
      } else if (value !== null && value !== undefined) {
        value = serializeValue(value, nestedCtor, activeGroups)
      }
    }

    // Output key: use @Expose({ name }) if present, otherwise the original key
    const outputKey = meta?.exposedName ?? key
    result[outputKey] = value
  }

  return result
}
