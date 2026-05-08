import type { ValidationError, Validator } from '../validator'
import { ValidationFailedError } from '../validator'

/**
 * Minimal structural type matching the parts of a Zod schema we need, so we
 * avoid a hard dependency on the `zod` package itself.
 */
type ZodLike<T> = {
  safeParse(input: unknown):
    | { success: true; data: T }
    | {
        success: false
        error: {
          issues: Array<{
            path: (string | number)[]
            message: string
          }>
        }
      }
}

function mapZodIssues(
  issues: Array<{ path: (string | number)[]; message: string }>,
): ValidationError[] {
  return issues.map((i) => ({ path: i.path, message: i.message }))
}

/**
 * Wrap a Zod schema as a Banhmi `Validator<T>`.
 *
 * The Zod package is an optional peer dependency — only import this adapter
 * when your project already has `zod` installed.
 *
 * @example
 * import { z } from 'zod'
 * import { zod } from '@banhmi/validation/zod'
 *
 * const createCatSchema = z.object({ name: z.string(), age: z.number().int() })
 * const v = zod(createCatSchema)
 * const r = v.safeParse({ name: 'mochi', age: 2 })
 * // r.ok === true
 */
export function zod<T>(schema: ZodLike<T>): Validator<T> {
  return {
    parse(input: unknown): T {
      const r = schema.safeParse(input)
      if (!r.success) {
        throw new ValidationFailedError(mapZodIssues(r.error.issues))
      }
      return r.data
    },
    safeParse(
      input: unknown,
    ): { ok: true; value: T } | { ok: false; errors: ValidationError[] } {
      const r = schema.safeParse(input)
      if (!r.success) {
        return { ok: false, errors: mapZodIssues(r.error.issues) }
      }
      return { ok: true, value: r.data }
    },
  }
}
