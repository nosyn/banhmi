import { EXTENSIONS_METADATA } from '../metadata-keys'

/**
 * Attaches arbitrary extension metadata to an Object Type or field.
 *
 * Extensions are accessible at runtime via the schema's extension map.
 *
 * @param extensions - A record of arbitrary key/value pairs.
 *
 * @example
 * @ObjectType()
 * @Extensions({ role: 'admin', cacheTtl: 30 })
 * class SecretCat {
 *   @Field(() => ID) id!: string
 * }
 */
export function Extensions(extensions: Record<string, unknown>) {
  return (
    _target: unknown,
    context: ClassDecoratorContext | ClassMemberDecoratorContext,
  ): void => {
    const existing =
      (context.metadata[EXTENSIONS_METADATA] as
        | Record<string, unknown>
        | undefined) ?? {}
    context.metadata[EXTENSIONS_METADATA] = { ...existing, ...extensions }
  }
}
