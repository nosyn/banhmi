import type { ValidationError, Validator } from '../validator'
import type { ClassRules, Rule } from './metadata'
import { RULES_KEY } from './metadata'
import type { ValidatorOptions } from './types'

// ─── Regex constants ─────────────────────────────────────────────────────────

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const URL_RE = /^https?:\/\/.+/i

// ─── Rule evaluator ──────────────────────────────────────────────────────────

function applyRules(
  value: unknown,
  rules: Rule[],
  path: (string | number)[],
  errors: ValidationError[],
): void {
  // Check for @IsOptional first — if present and value is absent, skip all rules.
  const hasOptional = rules.some((r) => r.kind === 'IsOptional')
  if (hasOptional && (value === undefined || value === null)) {
    return
  }

  for (const rule of rules) {
    if (rule.kind === 'IsOptional') continue // handled above

    const fail = (defaultMsg: string) => {
      errors.push({ path, message: rule.message ?? defaultMsg })
    }

    switch (rule.kind) {
      case 'IsString': {
        if (typeof value !== 'string') fail('must be a string')
        break
      }
      case 'IsEmail': {
        if (typeof value !== 'string' || !EMAIL_RE.test(value))
          fail('must be a valid email address')
        break
      }
      case 'IsUUID': {
        if (typeof value !== 'string' || !UUID_RE.test(value))
          fail('must be a valid UUID')
        break
      }
      case 'IsURL': {
        if (typeof value !== 'string' || !URL_RE.test(value))
          fail('must be a valid URL')
        break
      }
      case 'IsNotEmpty': {
        if (typeof value !== 'string' || value.trim().length === 0)
          fail('must not be empty')
        break
      }
      case 'IsNumber': {
        if (
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          Number.isNaN(value)
        )
          fail('must be a finite number')
        break
      }
      case 'IsInt': {
        if (!Number.isInteger(value)) fail('must be an integer')
        break
      }
      case 'IsFloat': {
        if (
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          Number.isNaN(value)
        )
          fail('must be a finite number')
        break
      }
      case 'Min': {
        const min = rule.args?.[0] as number
        if (typeof value !== 'number' || value < min)
          fail(`must be at least ${min}`)
        break
      }
      case 'Max': {
        const max = rule.args?.[0] as number
        if (typeof value !== 'number' || value > max)
          fail(`must be at most ${max}`)
        break
      }
      case 'IsPositive': {
        if (typeof value !== 'number' || value <= 0)
          fail('must be a positive number')
        break
      }
      case 'IsNegative': {
        if (typeof value !== 'number' || value >= 0)
          fail('must be a negative number')
        break
      }
      case 'IsBoolean': {
        if (typeof value !== 'boolean') fail('must be a boolean')
        break
      }
      case 'IsArray': {
        if (!Array.isArray(value)) fail('must be an array')
        break
      }
      case 'ArrayMinSize': {
        const min = rule.args?.[0] as number
        if (!Array.isArray(value) || value.length < min)
          fail(`array must contain at least ${min} element(s)`)
        break
      }
      case 'ArrayMaxSize': {
        const max = rule.args?.[0] as number
        if (!Array.isArray(value) || value.length > max)
          fail(`array must contain at most ${max} element(s)`)
        break
      }
      case 'IsDefined': {
        if (value === undefined || value === null) fail('must be defined')
        break
      }
      case 'IsIn': {
        const allowed = rule.args?.[0] as unknown[]
        if (!allowed.includes(value))
          fail(`must be one of: ${allowed.map(String).join(', ')}`)
        break
      }
      case 'Matches': {
        const pattern = rule.args?.[0] as RegExp
        if (typeof value !== 'string' || !pattern.test(value))
          fail(`must match pattern ${String(pattern)}`)
        break
      }
      case 'Length': {
        const minLen = rule.args?.[0] as number
        const maxLen = rule.args?.[1] as number
        if (
          typeof value !== 'string' ||
          value.length < minLen ||
          value.length > maxLen
        )
          fail(`length must be between ${minLen} and ${maxLen}`)
        break
      }
      case 'MinLength': {
        const minLen = rule.args?.[0] as number
        if (typeof value !== 'string' || value.length < minLen)
          fail(`length must be at least ${minLen}`)
        break
      }
      case 'MaxLength': {
        const maxLen = rule.args?.[0] as number
        if (typeof value !== 'string' || value.length > maxLen)
          fail(`length must be at most ${maxLen}`)
        break
      }
      case 'IsEnum': {
        const enumObj = rule.args?.[0] as Record<string, unknown>
        const allowed = Object.values(enumObj)
        if (!allowed.includes(value))
          fail(`must be a valid enum value: ${allowed.map(String).join(', ')}`)
        break
      }
      case 'IsDate': {
        if (!(value instanceof Date) || Number.isNaN(value.getTime()))
          fail('must be a valid Date instance')
        break
      }
      case 'IsObject': {
        if (value === null || typeof value !== 'object' || Array.isArray(value))
          fail('must be a plain object')
        break
      }
      case 'ValidateNested': {
        const typeFn = rule.nested
        if (typeFn === undefined) break

        const NestedCls = typeFn() as abstract new (...args: never[]) => unknown

        if (Array.isArray(value)) {
          const nestedValidator = classValidator(NestedCls)
          for (let i = 0; i < value.length; i++) {
            const r = nestedValidator.safeParse(value[i])
            if (!r.ok) {
              for (const e of r.errors) {
                errors.push({
                  path: [...path, i, ...e.path],
                  message: e.message,
                })
              }
            }
          }
        } else if (value !== null && typeof value === 'object') {
          const nestedValidator = classValidator(NestedCls)
          const r = nestedValidator.safeParse(value)
          if (!r.ok) {
            for (const e of r.errors) {
              errors.push({ path: [...path, ...e.path], message: e.message })
            }
          }
        } else {
          fail('must be an object or array for nested validation')
        }
        break
      }
    }
  }
}

// ─── Public builder ──────────────────────────────────────────────────────────

/**
 * Build a `Validator<InstanceType<C>>` from a class annotated with
 * class-validator-style decorators (`@IsString`, `@Min`, etc.).
 *
 * The returned validator uses `safeParse` / `parse` — the same interface as
 * the `native` and `zod` adapters, so it composes with `AdaptedValidationPipe`
 * unchanged.
 *
 * @example
 * class CreateCatDto {
 *   \@IsString()
 *   \@MinLength(2)
 *   name!: string
 *
 *   \@IsInt()
 *   \@Min(0)
 *   age!: number
 * }
 *
 * const v = classValidator(CreateCatDto)
 * const r = v.safeParse({ name: 'Tom', age: 3 })
 * // r.ok === true
 *
 * @example
 * // With AdaptedValidationPipe:
 * const pipe = new AdaptedValidationPipe(classValidator(CreateCatDto))
 */
export function classValidator<
  C extends abstract new (
    ...args: never[]
  ) => unknown,
>(Cls: C, _opts?: ValidatorOptions): Validator<InstanceType<C>> {
  const meta = (Cls as { [Symbol.metadata]?: Record<symbol, unknown> })[
    Symbol.metadata
  ]
  const rules: ClassRules =
    meta !== undefined && meta[RULES_KEY] instanceof Map
      ? (meta[RULES_KEY] as ClassRules)
      : new Map()

  return {
    parse(input: unknown): InstanceType<C> {
      const r = this.safeParse(input)
      if (!r.ok) {
        throw new Error(
          r.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        )
      }
      return r.value
    },

    safeParse(
      input: unknown,
    ):
      | { ok: true; value: InstanceType<C> }
      | { ok: false; errors: ValidationError[] } {
      const errors: ValidationError[] = []
      const value = input as Record<string, unknown>

      for (const [propName, propRules] of rules) {
        const v = value?.[propName]
        applyRules(v, propRules, [propName], errors)
      }

      if (errors.length > 0) {
        return { ok: false, errors }
      }
      return { ok: true, value: value as InstanceType<C> }
    },
  }
}
