import { DIRECTIVE_METADATA } from '../metadata-keys'

/**
 * Adds a GraphQL directive to an Object Type or field.
 *
 * @param sdl - The raw directive SDL string, e.g. `'@deprecated(reason: "Use newField")'`.
 *
 * @example
 * @ObjectType()
 * class Cat {
 *   @Field()
 *   @Directive('@deprecated(reason: "Use nickname instead")')
 *   name!: string
 * }
 */
export function Directive(sdl: string) {
  return (
    _target: unknown,
    context: ClassDecoratorContext | ClassMemberDecoratorContext,
  ): void => {
    const existing =
      (context.metadata[DIRECTIVE_METADATA] as string[] | undefined) ?? []
    context.metadata[DIRECTIVE_METADATA] = [...existing, sdl]
  }
}
