import type { ApiPropertyOptions, ModelClass } from './decorators'
import { API_PROPERTY_METADATA } from './decorators'

/**
 * Map an OpenAPI/TypeScript type string to a GraphQL scalar name.
 * @internal
 */
function toGraphQlScalar(
  type: string | ModelClass | undefined,
  format?: string,
): string {
  if (typeof type === 'function') {
    return (type as { name: string }).name
  }
  switch (type) {
    case 'string':
      return 'String'
    case 'number':
      return format === 'int' || format === 'int32' || format === 'int64'
        ? 'Int'
        : 'Float'
    case 'boolean':
      return 'Boolean'
    case 'integer':
      return 'Int'
    default:
      return 'String'
  }
}

/**
 * Generate a GraphQL Schema Definition Language (SDL) string from a list of
 * OpenAPI-decorated model classes.
 *
 * Each class must have at least one property decorated with `@ApiProperty` for
 * it to appear in the SDL output. The mapping follows:
 *
 * | OpenAPI / TS type      | GraphQL type     |
 * |------------------------|------------------|
 * | `string`               | `String`         |
 * | `number` (default)     | `Float`          |
 * | `number` + `format: 'int'` | `Int`        |
 * | `boolean`              | `Boolean`        |
 * | `Array<T>`             | `[T!]`           |
 * | Class reference        | Type name        |
 *
 * Required properties (the default) end with `!`; optional properties do not.
 *
 * @param models - Array of class constructors decorated with `@ApiProperty`.
 * @returns A GraphQL SDL string, or an empty string if no models are provided.
 *
 * @example
 * class Cat {
 *   \@ApiProperty({ type: 'string' })
 *   name: string
 *
 *   \@ApiProperty({ type: 'number', format: 'int' })
 *   age: number
 * }
 *
 * generateSdl([Cat])
 * // → 'type Cat {\n  name: String!\n  age: Int!\n}'
 */
export function generateSdl(models: Array<ModelClass>): string {
  if (models.length === 0) return ''

  const blocks: string[] = []

  for (const model of models) {
    const meta =
      (model[Symbol.metadata] as Record<symbol, unknown> | null) ?? {}
    const props =
      (meta[API_PROPERTY_METADATA] as Record<string, ApiPropertyOptions>) ?? {}

    const fields: string[] = []

    for (const [propName, opts] of Object.entries(props)) {
      const required = opts.required !== false
      const bang = required ? '!' : ''

      // Handle array types
      if (Array.isArray(opts.type)) {
        const elementType = opts.type[0]
        const gqlElement = toGraphQlScalar(elementType, opts.format)
        fields.push(`  ${propName}: [${gqlElement}!]${bang}`)
      } else {
        const gqlType = toGraphQlScalar(opts.type, opts.format)
        fields.push(`  ${propName}: ${gqlType}${bang}`)
      }
    }

    if (fields.length === 0) continue

    blocks.push(
      `type ${(model as { name: string }).name} {\n${fields.join('\n')}\n}`,
    )
  }

  return blocks.join('\n\n')
}
