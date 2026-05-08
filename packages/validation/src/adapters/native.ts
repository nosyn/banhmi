import type { ValidationError, Validator } from '../validator'
import { ValidationFailedError } from '../validator'

/**
 * Declarative spec for the native validator.
 *
 * A spec is either a primitive type name or a structural descriptor for arrays,
 * objects, or optional wrappers.
 */
export type Spec =
  | 'string'
  | 'number'
  | 'boolean'
  | { type: 'array'; of: Spec }
  | { type: 'object'; shape: Record<string, Spec>; required?: string[] }
  | { type: 'optional'; of: Spec }

function validateSpec(
  input: unknown,
  spec: Spec,
  path: (string | number)[],
): ValidationError[] {
  if (spec === 'string') {
    if (typeof input !== 'string') {
      return [{ path, message: `Expected string, got ${typeof input}` }]
    }
    return []
  }

  if (spec === 'number') {
    if (typeof input !== 'number') {
      return [{ path, message: `Expected number, got ${typeof input}` }]
    }
    return []
  }

  if (spec === 'boolean') {
    if (typeof input !== 'boolean') {
      return [{ path, message: `Expected boolean, got ${typeof input}` }]
    }
    return []
  }

  if (spec.type === 'optional') {
    if (input === undefined || input === null) {
      return []
    }
    return validateSpec(input, spec.of, path)
  }

  if (spec.type === 'array') {
    if (!Array.isArray(input)) {
      return [{ path, message: `Expected array, got ${typeof input}` }]
    }
    const errors: ValidationError[] = []
    for (let i = 0; i < input.length; i++) {
      errors.push(...validateSpec(input[i], spec.of, [...path, i]))
    }
    return errors
  }

  if (spec.type === 'object') {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      return [
        {
          path,
          message: `Expected object, got ${Array.isArray(input) ? 'array' : typeof input}`,
        },
      ]
    }
    const record = input as Record<string, unknown>
    const errors: ValidationError[] = []

    const required = spec.required ?? []
    for (const key of required) {
      if (
        !(key in record) ||
        record[key] === undefined ||
        record[key] === null
      ) {
        errors.push({ path: [...path, key], message: 'Required field missing' })
      }
    }

    for (const [key, fieldSpec] of Object.entries(spec.shape)) {
      if (!(key in record)) {
        // Only required fields are checked above; optional keys absent = ok
        const isRequired = required.includes(key)
        if (isRequired) {
          // already reported above
        }
        continue
      }
      errors.push(...validateSpec(record[key], fieldSpec, [...path, key]))
    }

    return errors
  }

  return [{ path, message: `Unknown spec type` }]
}

/**
 * Build a `Validator<T>` from a tiny declarative spec, with zero external
 * dependencies.
 *
 * Supported spec forms:
 * - `'string'` | `'number'` | `'boolean'` — primitive type checks.
 * - `{ type: 'object', shape, required? }` — object with typed fields.
 * - `{ type: 'array', of: Spec }` — homogeneous array.
 * - `{ type: 'optional', of: Spec }` — allows `null` / `undefined`.
 *
 * @example
 * const dto = native({
 *   type: 'object',
 *   shape: { name: 'string', age: 'number' },
 *   required: ['name'],
 * })
 * const r = dto.safeParse({ name: 'mochi' })
 * // r.ok === true, r.value === { name: 'mochi' }
 */
export function native<T = unknown>(spec: Spec): Validator<T> {
  return {
    parse(input: unknown): T {
      const errors = validateSpec(input, spec, [])
      if (errors.length > 0) {
        throw new ValidationFailedError(errors)
      }
      return input as T
    },
    safeParse(
      input: unknown,
    ): { ok: true; value: T } | { ok: false; errors: ValidationError[] } {
      const errors = validateSpec(input, spec, [])
      if (errors.length > 0) {
        return { ok: false, errors }
      }
      return { ok: true, value: input as T }
    },
  }
}
