import type { PropertyMeta, TransformMap } from './metadata'
import { TRANSFORM_METADATA } from './metadata'

/**
 * Options for `@Expose()`.
 *
 * @example
 * \@Expose({ name: 'user_id', groups: ['admin'] })
 * id: number
 */
export type ExposeOptions = {
  /** Override the serialised key name. */
  name?: string
  /**
   * Restrict this field to the given groups. When `serialize()` is called
   * without a matching group the field is omitted.
   */
  groups?: string[]
}

/**
 * Function signature for `@Transform()`.
 *
 * @param value - The raw property value on the source instance.
 * @param instance - The source object being serialised.
 * @returns The transformed value to include in the output.
 */
export type TransformFn = (value: unknown, instance: object) => unknown

/**
 * Options for `serialize()`.
 *
 * @example
 * serialize(user, UserDto, { groups: ['admin'] })
 */
export type TransformOptions = {
  /** Only include fields whose `@Expose({ groups })` intersects this list. */
  groups?: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOrCreate(
  context: ClassFieldDecoratorContext,
  key: string,
): PropertyMeta {
  const meta = context.metadata as Record<symbol, TransformMap>
  if (!meta[TRANSFORM_METADATA]) {
    meta[TRANSFORM_METADATA] = {}
  }
  const map = meta[TRANSFORM_METADATA]
  if (!map[key]) {
    map[key] = {}
  }
  return map[key]
}

// ─── Decorators ──────────────────────────────────────────────────────────────

/**
 * Mark a property to be **included** in `serialize()` output. Optionally
 * rename the output key via `name` and restrict the field to specific groups.
 *
 * Without `@Expose`, properties are included by default unless `@Exclude` is
 * applied. Apply `@Expose` to rename or add group restrictions.
 *
 * @example
 * class UserDto {
 *   \@Expose({ name: 'user_id' })
 *   id: number
 *
 *   \@Expose({ groups: ['admin'] })
 *   email: string
 * }
 */
export function Expose(
  opts: ExposeOptions = {},
): (_target: unknown, context: ClassFieldDecoratorContext) => void {
  return (_target, context) => {
    const key = String(context.name)
    const meta = getOrCreate(context, key)
    meta.exposed = true
    if (opts.name !== undefined) meta.exposedName = opts.name
    if (opts.groups !== undefined) meta.groups = opts.groups
  }
}

/**
 * Mark a property to be **excluded** from `serialize()` output regardless of
 * any default inclusion.
 *
 * @example
 * class UserDto {
 *   \@Exclude()
 *   password: string
 * }
 */
export function Exclude(): (
  _target: unknown,
  context: ClassFieldDecoratorContext,
) => void {
  return (_target, context) => {
    const key = String(context.name)
    const meta = getOrCreate(context, key)
    meta.excluded = true
  }
}

/**
 * Apply a custom transformation to a property during `serialize()`.
 *
 * @example
 * class UserDto {
 *   \@Transform((v) => (v as string).toUpperCase())
 *   name: string
 * }
 */
export function Transform(
  fn: TransformFn,
): (_target: unknown, context: ClassFieldDecoratorContext) => void {
  return (_target, context) => {
    const key = String(context.name)
    const meta = getOrCreate(context, key)
    meta.transformFn = fn
  }
}

/**
 * Tell `serialize()` to recurse into nested objects or arrays using the given
 * constructor's transform metadata.
 *
 * @example
 * class PostDto {
 *   \@Type(() => AuthorDto)
 *   author: AuthorDto
 *
 *   \@Type(() => TagDto)
 *   tags: TagDto[]
 * }
 */
export function Type(
  fn: () => new () => unknown,
): (_target: unknown, context: ClassFieldDecoratorContext) => void {
  return (_target, context) => {
    const key = String(context.name)
    const meta = getOrCreate(context, key)
    meta.typeFn = fn
  }
}
