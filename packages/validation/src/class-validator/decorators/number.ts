import { addRule } from '../metadata'

type Opts = { message?: string }

// ─── Number decorators ───────────────────────────────────────────────────────

/**
 * Asserts the value is a finite `number` (NaN and Infinity fail).
 *
 * @example
 * class Dto {
 *   \@IsNumber()
 *   age!: number
 * }
 */
export function IsNumber(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsNumber',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is an integer (`Number.isInteger`).
 *
 * @example
 * class Dto {
 *   \@IsInt()
 *   count!: number
 * }
 */
export function IsInt(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsInt',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is a finite number (alias for `@IsNumber` — explicitly
 * accepts floats).
 *
 * @example
 * class Dto {
 *   \@IsFloat()
 *   price!: number
 * }
 */
export function IsFloat(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsFloat',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is ≥ `min`.
 *
 * @param min - Inclusive lower bound.
 *
 * @example
 * class Dto {
 *   \@Min(0)
 *   age!: number
 * }
 */
export function Min(min: number, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'Min',
      args: [min],
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is ≤ `max`.
 *
 * @param max - Inclusive upper bound.
 *
 * @example
 * class Dto {
 *   \@Max(120)
 *   age!: number
 * }
 */
export function Max(max: number, opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'Max',
      args: [max],
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is a number greater than zero.
 *
 * @example
 * class Dto {
 *   \@IsPositive()
 *   price!: number
 * }
 */
export function IsPositive(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsPositive',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is a number less than zero.
 *
 * @example
 * class Dto {
 *   \@IsNegative()
 *   balance!: number
 * }
 */
export function IsNegative(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsNegative',
      message: opts?.message,
    })
  }
}
