import { FEDERATION_KEY_METADATA } from '../metadata-keys'

/**
 * Marks a type as a Federation entity with the given key fields.
 *
 * @param fields - Space-separated field names that form the entity key
 *   (e.g. `'id'`, `'id email'`).
 *
 * @example
 * @ObjectType()
 * @Key('id')
 * class User {
 *   @Field(() => ID) id!: string
 *   @Field() email!: string
 * }
 */
export function Key(fields: string) {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    const existing =
      (context.metadata[FEDERATION_KEY_METADATA] as string[] | undefined) ?? []
    context.metadata[FEDERATION_KEY_METADATA] = [...existing, fields]
  }
}

/**
 * Marks a field as external in a Federation subgraph.
 *
 * External fields are defined in another subgraph and referenced here for
 * type resolution.
 *
 * @example
 * @ObjectType()
 * @Key('id')
 * @Extends
 * class Product {
 *   @External
 *   @Field(() => ID) id!: string
 * }
 */
export const External = Symbol('graphql:federation:external')

/**
 * Marks an entity type as extending a base type from another subgraph.
 *
 * @example
 * @ObjectType()
 * @Key('id')
 * @ExtendsType()
 * class Product {
 *   @External
 *   @Field(() => ID) id!: string
 * }
 */
export function ExtendsType() {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    _context: ClassDecoratorContext<T>,
  ): void => {
    // No-op: handled by schema builder; marks the type as an extension
  }
}
