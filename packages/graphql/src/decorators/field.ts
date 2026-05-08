import { FIELD_METADATA } from '../metadata-keys'
import type { FieldMeta, FieldOptions } from '../types'

/**
 * Marks a class property as a GraphQL field.
 *
 * @param typeFn - Thunk returning the GraphQL type (e.g. `() => String`, `() => [Cat]`).
 * @param options - Optional field configuration.
 *
 * @example
 * @ObjectType()
 * class Cat {
 *   @Field(() => ID) id!: string
 *   @Field(() => String, { nullable: true }) nickname?: string
 *   @Field(() => Int) age!: number
 * }
 */
export function Field(
  typeFn?: () => unknown,
  options: FieldOptions = {},
): PropertyDecorator {
  return (_target: unknown, context: ClassMemberDecoratorContext): void => {
    const propertyKey = String(context.name)
    const resolvedTypeFn = typeFn ?? (() => String)

    const meta: FieldMeta = {
      typeFn: resolvedTypeFn,
      options,
      propertyKey,
    }

    const existing =
      (context.metadata[FIELD_METADATA] as FieldMeta[] | undefined) ?? []
    context.metadata[FIELD_METADATA] = [...existing, meta]
  }
}
