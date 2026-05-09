/**
 * Class-validator-style property decorators for Banhmi.
 *
 * Decorators use TC39 Stage 3 syntax + `Symbol.metadata` — no
 * `reflect-metadata`, no `experimentalDecorators`.
 *
 * @example
 * import { IsString, IsEmail, MinLength, classValidator } from '@banhmi/validation'
 * import { AdaptedValidationPipe } from '@banhmi/validation'
 *
 * class CreateUserDto {
 *   \@IsString()
 *   \@MinLength(2)
 *   name!: string
 *
 *   \@IsEmail()
 *   email!: string
 * }
 *
 * const pipe = new AdaptedValidationPipe(classValidator(CreateUserDto))
 */

export {
  ArrayMaxSize,
  ArrayMinSize,
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
} from './decorators'
export type { ValidatorOptions } from './types'
export { classValidator } from './validator-from-class'
