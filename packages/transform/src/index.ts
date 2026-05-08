import '@banhmi/common'

/**
 * @banhmi/transform — Class-transformer parity via `Symbol.metadata`.
 *
 * Pure decorators + `serialize` / `deserialize` functions only — no DI
 * integration this wave (a `ClassSerializerInterceptor` is a Wave 6 concern).
 *
 * Decorators write to `[TRANSFORM_METADATA]` on `Class[Symbol.metadata]` via
 * the TC39 Stage 3 decorator context API.
 *
 * @example
 * import { Exclude, Expose, Transform, Type, serialize } from '@banhmi/transform'
 *
 * class AddressDto {
 *   city: string
 *   country: string
 * }
 *
 * class UserDto {
 *   name: string
 *
 *   \@Exclude()
 *   password: string
 *
 *   \@Expose({ name: 'user_id' })
 *   id: number
 *
 *   \@Expose({ groups: ['admin'] })
 *   email: string
 *
 *   \@Type(() => AddressDto)
 *   address: AddressDto
 * }
 *
 * const out = serialize(user, UserDto)
 * // => { name: ..., user_id: ..., address: { city: ..., country: ... } }
 *
 * const adminOut = serialize(user, UserDto, { groups: ['admin'] })
 * // => { name: ..., user_id: ..., email: ..., address: ... }
 */

export type { ExposeOptions, TransformFn, TransformOptions } from './decorators'
export {
  Exclude,
  Expose,
  Transform,
  Type,
} from './decorators'
export { deserialize, serialize } from './serialize'
