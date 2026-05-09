import { addRule } from '../metadata'

type Opts = { message?: string }

/**
 * Asserts the value is a member of the given enum object.
 *
 * @param enumType - A TypeScript enum object (string or numeric).
 *
 * @example
 * enum Role { Admin = 'admin', User = 'user' }
 *
 * class Dto {
 *   \@IsEnum(Role)
 *   role!: Role
 * }
 */
export function IsEnum(enumType: Record<string, unknown>, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsEnum',
      args: [enumType],
      message: opts?.message,
    })
  }
}
