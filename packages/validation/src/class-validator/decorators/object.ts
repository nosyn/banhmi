import { addRule } from '../metadata'

type Opts = { message?: string }

/**
 * Asserts the value is a plain object (not `null`, not an array).
 *
 * @example
 * class Dto {
 *   \@IsObject()
 *   metadata!: Record<string, unknown>
 * }
 */
export function IsObject(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsObject',
      message: opts?.message,
    })
  }
}

/**
 * Recursively validates a nested DTO class. Must be paired with `@Type` (or
 * the `nested` option) so the validator knows which class to instantiate.
 *
 * @param typeFn - Thunk returning the nested class constructor.
 *
 * @example
 * class AddressDto {
 *   \@IsString() street!: string
 *   \@IsString() city!: string
 * }
 *
 * class CreateUserDto {
 *   \@ValidateNested(() => AddressDto)
 *   address!: AddressDto
 * }
 */
export function ValidateNested(typeFn: () => unknown, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'ValidateNested',
      nested: typeFn,
      message: opts?.message,
    })
  }
}
