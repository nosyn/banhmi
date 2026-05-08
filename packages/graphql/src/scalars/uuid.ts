import { GraphQLScalarType, type GraphQLScalarTypeConfig, Kind } from 'graphql'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A custom GraphQL scalar that validates UUID v4 strings.
 *
 * @example
 * @Field(() => UuidScalar)
 * id!: string
 */
export const UuidScalar = new GraphQLScalarType({
  name: 'UUID',
  description:
    'A UUID (Universally Unique Identifier) string in RFC 4122 format.',
  serialize(value: unknown): string {
    if (typeof value === 'string' && UUID_REGEX.test(value)) return value
    throw new Error(`UuidScalar: invalid UUID value: ${JSON.stringify(value)}`)
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string' && UUID_REGEX.test(value)) return value
    throw new Error(`UuidScalar: invalid UUID value: ${JSON.stringify(value)}`)
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING && UUID_REGEX.test(ast.value)) return ast.value
    throw new Error(`UuidScalar: invalid UUID literal: ${JSON.stringify(ast)}`)
  },
} satisfies GraphQLScalarTypeConfig<string, string>)
