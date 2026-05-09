/**
 * @banhmi/validation — Adapter-based validation pipeline for Banhmi.
 *
 * Ships a built-in `native` adapter with zero dependencies. The Zod adapter is
 * available via the `@banhmi/validation/zod` subpath import so users only pay
 * for what they use.
 *
 * Note: `@banhmi/common` also exports a `ValidationPipe` that implements the
 * [Standard Schema](https://standardschema.dev) interface (compatible with Zod
 * v3.24+, Valibot, etc.). Use `AdaptedValidationPipe` from this package when
 * you prefer the explicit `Validator<T>` adapter API.
 *
 * @example
 * // Native adapter
 * import { native, AdaptedValidationPipe } from '@banhmi/validation'
 *
 * const schema = native({ type: 'object', shape: { name: 'string' }, required: ['name'] })
 * const pipe = new AdaptedValidationPipe(schema)
 *
 * @example
 * // Zod adapter (separate subpath)
 * import { z } from 'zod'
 * import { zod } from '@banhmi/validation/zod'
 * import { AdaptedValidationPipe } from '@banhmi/validation'
 *
 * const pipe = new AdaptedValidationPipe(zod(z.object({ name: z.string() })))
 */

export type { Spec } from './adapters/native'
export { native } from './adapters/native'
export type { ValidatorOptions } from './class-validator'
export {
  ArrayMaxSize,
  ArrayMinSize,
  classValidator,
  IsArray,
  IsBoolean,
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsFloat,
  IsIn,
  IsInt,
  IsNegative,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsURL,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from './class-validator'
export { AdaptedValidationPipe, ValidationException } from './validation.pipe'
export type { ValidationError, Validator } from './validator'
export { ValidationFailedError } from './validator'
// Zod adapter exported via subpath: import { zod } from '@banhmi/validation/zod'
