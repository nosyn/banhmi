import { addRule } from '../metadata'

type Opts = { message?: string }

/**
 * Asserts the value is a `Date` instance (and not `Invalid Date`).
 *
 * @example
 * class Dto {
 *   \@IsDate()
 *   createdAt!: Date
 * }
 */
export function IsDate(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsDate',
      message: opts?.message,
    })
  }
}
