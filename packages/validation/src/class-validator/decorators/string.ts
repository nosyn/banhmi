import { addRule } from '../metadata'

// ─── Shared options ──────────────────────────────────────────────────────────

type Opts = { message?: string }

// ─── String decorators ───────────────────────────────────────────────────────

/**
 * Asserts the value is a `string`.
 *
 * @example
 * class Dto {
 *   \@IsString()
 *   name!: string
 * }
 */
export function IsString(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsString',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is a valid e-mail address (RFC-5322 simplified pattern).
 *
 * @example
 * class Dto {
 *   \@IsEmail()
 *   email!: string
 * }
 */
export function IsEmail(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsEmail',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is a UUID (v1–v5, case-insensitive).
 *
 * @example
 * class Dto {
 *   \@IsUUID()
 *   id!: string
 * }
 */
export function IsUUID(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsUUID',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is a URL (`http://` or `https://`).
 *
 * @example
 * class Dto {
 *   \@IsURL()
 *   website!: string
 * }
 */
export function IsURL(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsURL',
      message: opts?.message,
    })
  }
}

/**
 * Asserts the value is a non-empty string (length > 0 after trimming).
 *
 * @example
 * class Dto {
 *   \@IsNotEmpty()
 *   title!: string
 * }
 */
export function IsNotEmpty(opts?: Opts) {
  return (_target: unknown, context: ClassFieldDecoratorContext) => {
    addRule(context, String(context.name), {
      kind: 'IsNotEmpty',
      message: opts?.message,
    })
  }
}
