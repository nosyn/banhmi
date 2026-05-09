import { addRule } from '../metadata'

type Opts = { message?: string }

/**
 * Marks the property as optional. When the value is `undefined` or `null`,
 * all other validation rules on the same property are skipped.
 *
 * @example
 * class Dto {
 *   \@IsOptional()
 *   \@IsString()
 *   bio?: string
 * }
 */
export function IsOptional(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsOptional',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is not `undefined` or `null`.
 *
 * @example
 * class Dto {
 *   \@IsDefined()
 *   name!: string
 * }
 */
export function IsDefined(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsDefined',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is one of the given allowed values.
 *
 * @param allowed - Array of permitted values.
 *
 * @example
 * class Dto {
 *   \@IsIn(['admin', 'user', 'guest'])
 *   role!: string
 * }
 */
export function IsIn(allowed: unknown[], opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsIn',
      args: [allowed],
      message: opts?.message,
    })
  }
}

/**
 * Asserts the string value matches the given regular expression.
 *
 * @param pattern - Regular expression to test against.
 *
 * @example
 * class Dto {
 *   \@Matches(/^[a-z]+$/)
 *   slug!: string
 * }
 */
export function Matches(pattern: RegExp, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'Matches',
      args: [pattern],
      message: opts?.message,
    })
  }
}

/**
 * Asserts the string length is between `min` and `max` (inclusive).
 *
 * @param min - Minimum length.
 * @param max - Maximum length.
 *
 * @example
 * class Dto {
 *   \@Length(2, 50)
 *   username!: string
 * }
 */
export function Length(min: number, max: number, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'Length',
      args: [min, max],
      message: opts?.message,
    })
  }
}

/**
 * Asserts the string length is at least `min`.
 *
 * @param min - Minimum length (inclusive).
 *
 * @example
 * class Dto {
 *   \@MinLength(2)
 *   name!: string
 * }
 */
export function MinLength(min: number, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'MinLength',
      args: [min],
      message: opts?.message,
    })
  }
}

/**
 * Asserts the string length is at most `max`.
 *
 * @param max - Maximum length (inclusive).
 *
 * @example
 * class Dto {
 *   \@MaxLength(100)
 *   bio!: string
 * }
 */
export function MaxLength(max: number, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'MaxLength',
      args: [max],
      message: opts?.message,
    })
  }
}
