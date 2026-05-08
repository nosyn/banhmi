import { GraphQLScalarType, type GraphQLScalarTypeConfig, Kind } from 'graphql'

/**
 * A custom GraphQL scalar that serializes JavaScript `Date` objects to ISO-8601 strings.
 *
 * @example
 * GraphQLModule.forRoot({
 *   resolvers: [],
 *   // Automatically included when DateScalar is in the providers list
 * })
 *
 * // In a type:
 * @Field(() => DateScalar)
 * createdAt!: Date
 */
export const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description:
    'ISO-8601 date-time scalar. Serializes to string, parses from string or number.',
  serialize(value: unknown): string {
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) return d.toISOString()
    }
    throw new Error(
      `DateScalar cannot serialize value: ${JSON.stringify(value)}`,
    )
  },
  parseValue(value: unknown): Date {
    if (value instanceof Date) return value
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) return d
    }
    throw new Error(`DateScalar cannot parse value: ${JSON.stringify(value)}`)
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      const d = new Date(ast.value)
      if (!Number.isNaN(d.getTime())) return d
    }
    throw new Error(`DateScalar cannot parse literal: ${ast.kind}`)
  },
} satisfies GraphQLScalarTypeConfig<Date, string>)
