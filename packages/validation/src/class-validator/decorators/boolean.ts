import { addRule } from '../metadata'

type Opts = { message?: string }

/**
 * Asserts the value is a `boolean` (`true` or `false`).
 *
 * @example
 * class Dto {
 *   \@IsBoolean()
 *   active!: boolean
 * }
 */
export function IsBoolean(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsBoolean',
      message: opts?.message,
    })
  }
}
