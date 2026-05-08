import type { GraphQLNamedType, GraphQLScalarType } from 'graphql'

/**
 * Internal registry maintained by the schema builder.
 * @internal
 */
export interface TypeRegistry {
  /** Map from class reference to built GraphQLNamedType. */
  types: Map<unknown, GraphQLNamedType>
  /** Custom scalars registered for use in schemas. */
  scalars: Map<string, GraphQLScalarType>
}

/**
 * Configuration for the schema builder.
 * @internal
 */
export interface SchemaBuilderConfig {
  /** Additional custom scalars to include. */
  scalars?: GraphQLScalarType[]
}
