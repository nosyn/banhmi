import { GraphQLScalarType, type GraphQLScalarTypeConfig, Kind } from 'graphql'

/**
 * A custom GraphQL scalar that serializes any JSON-compatible value.
 *
 * @example
 * @Field(() => JsonScalar, { nullable: true })
 * metadata?: Record<string, unknown>
 */
export const JsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description:
    'Arbitrary JSON value. Accepts any JSON-serializable value (object, array, string, number, boolean, null).',
  serialize(value: unknown): unknown {
    return value
  },
  parseValue(value: unknown): unknown {
    return value
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value
      case Kind.INT:
      case Kind.FLOAT:
        return Number.parseFloat(ast.value)
      case Kind.OBJECT: {
        const obj: Record<string, unknown> = {}
        for (const field of ast.fields) {
          obj[field.name.value] = JsonScalar.parseLiteral(field.value)
        }
        return obj
      }
      case Kind.LIST:
        return ast.values.map((v) => JsonScalar.parseLiteral(v))
      case Kind.NULL:
        return null
      default:
        return null
    }
  },
} satisfies GraphQLScalarTypeConfig<unknown, unknown>)
