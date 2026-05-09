import { addRule } from '../metadata'

type Opts = { message?: string }

/**
 * Asserts the value is an `Array`.
 *
 * @example
 * class Dto {
 *   \@IsArray()
 *   tags!: string[]
 * }
 */
export function IsArray(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsArray',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the array has at least `min` elements.
 *
 * @param min - Minimum array length (inclusive).
 *
 * @example
 * class Dto {
 *   \@ArrayMinSize(1)
 *   tags!: string[]
 * }
 */
export function ArrayMinSize(min: number, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'ArrayMinSize',
      args: [min],
      message: opts?.message,
    })
  }
}

/**
 * Asserts the array has at most `max` elements.
 *
 * @param max - Maximum array length (inclusive).
 *
 * @example
 * class Dto {
 *   \@ArrayMaxSize(10)
 *   tags!: string[]
 * }
 */
export function ArrayMaxSize(max: number, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'ArrayMaxSize',
      args: [max],
      message: opts?.message,
    })
  }
}
