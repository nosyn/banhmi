/**
 * A `ValidationError` describes a single field-level failure.
 *
 * @example
 * const err: ValidationError = { path: ['user', 'age'], message: 'Expected number' }
 */
export type ValidationError = {
  path: (string | number)[]
  message: string
}

/**
 * A `Validator<T>` parses unknown input into a typed value, or returns
 * structured errors without throwing.
 *
 * @example
 * const v: Validator<{ name: string }> = native({
 *   type: 'object',
 *   shape: { name: 'string' },
 *   required: ['name'],
 * })
 * const r = v.safeParse({ name: 'mochi' })
 * if (r.ok) console.log(r.value.name)
 */
export interface Validator<T> {
  /**
   * Parse `input` into `T`, throwing a `ValidationFailedError` on failure.
   */
  parse(input: unknown): T
  /**
   * Parse `input` into `T`, returning either `{ ok: true; value: T }` or
   * `{ ok: false; errors: ValidationError[] }` — never throws.
   */
  safeParse(
    input: unknown,
  ): { ok: true; value: T } | { ok: false; errors: ValidationError[] }
}

/**
 * Thrown by `Validator.parse()` when validation fails.
 *
 * @example
 * try {
 *   v.parse({ age: 'oops' })
 * } catch (e) {
 *   if (e instanceof ValidationFailedError) console.log(e.errors)
 * }
 */
export class ValidationFailedError extends Error {
  constructor(readonly errors: ValidationError[]) {
    super(
      `Validation failed: ${errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
    )
    this.name = 'ValidationFailedError'
  }
}
