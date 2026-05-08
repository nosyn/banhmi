import { buildSubgraphSchema } from '@apollo/subgraph'
import type { GraphQLSchema } from 'graphql'
import { printSchema } from 'graphql'
import { gql } from 'graphql-tag'
import {
  FEDERATION_KEY_METADATA,
  FIELD_METADATA,
  OBJECT_TYPE_METADATA,
} from '../metadata-keys'
import type { FieldMeta } from '../types'

type AnyClass = new (...args: unknown[]) => unknown

/**
 * Result of {@link buildFederationSubgraphSchema}.
 */
export interface SubgraphSchemaResult {
  /** The Apollo Federation-compatible subgraph schema. */
  schema: GraphQLSchema
  /** The SDL string for the subgraph. */
  sdl: string
}

/**
 * Builds an Apollo Federation v2 subgraph schema from an existing GraphQL schema.
 *
 * Takes the base schema built by {@link SchemaBuilder} and wraps it with
 * Federation directives using `@apollo/subgraph`'s `buildSubgraphSchema`.
 *
 * @remarks
 * Requires `@apollo/subgraph` as a peer dependency.
 *
 * @param baseSchema - The schema built by {@link SchemaBuilder}.
 * @param entityClasses - Entity classes decorated with `@Key`.
 *
 * @example
 * const { schema } = buildFederationSubgraphSchema(schema, [UserEntity])
 *
 * @see https://www.apollographql.com/docs/federation/subgraphs/
 */
export function buildFederationSubgraphSchema(
  baseSchema: GraphQLSchema,
  entityClasses: AnyClass[],
): SubgraphSchemaResult {
  const baseSdl = printSchema(baseSchema)

  // Build the federation directives and type extensions
  let federationSdl = baseSdl

  // Add @key directives to entity types
  for (const cls of entityClasses) {
    const sym = Symbol.metadata
    if (!sym) continue
    const meta = (cls as Record<symbol, unknown>)[sym] as
      | Record<symbol, unknown>
      | undefined
    if (!meta) continue

    const keys = meta[FEDERATION_KEY_METADATA] as string[] | undefined
    if (!keys || keys.length === 0) continue

    const typeMeta = meta[OBJECT_TYPE_METADATA] as { name: string } | undefined
    const typeName = typeMeta?.name ?? cls.name

    // Inject @key directives into the SDL for this type
    const keyDirectives = keys.map((k) => `@key(fields: "${k}")`).join(' ')
    federationSdl = federationSdl.replace(
      new RegExp(`(type ${typeName}\\b[^{]*?)\\{`),
      `$1${keyDirectives} {`,
    )
  }

  // Build the subgraph schema using @apollo/subgraph
  const typeDefs = gql`${federationSdl}`
  const schema = buildSubgraphSchema({ typeDefs, resolvers: {} })

  return { schema, sdl: federationSdl }
}

/**
 * Extracts the federation entity resolver map for `__resolveReference`.
 *
 * Each entity class should implement a static `resolveReference(ref)` method.
 *
 * @param entityClasses - Entity classes with `resolveReference` static method.
 *
 * @example
 * class User {
 *   static async resolveReference(ref: { id: string }) {
 *     return UserService.findById(ref.id)
 *   }
 * }
 * const resolvers = buildEntityResolvers([User])
 */
export function buildEntityResolvers(
  entityClasses: (AnyClass & {
    resolveReference?: (ref: Record<string, unknown>) => unknown
  })[],
): Record<
  string,
  { __resolveReference: (ref: Record<string, unknown>) => unknown }
> {
  const resolvers: Record<
    string,
    { __resolveReference: (ref: Record<string, unknown>) => unknown }
  > = {}
  for (const cls of entityClasses) {
    const typeName = cls.name
    if (cls.resolveReference) {
      resolvers[typeName] = {
        __resolveReference: (ref) => cls.resolveReference?.(ref),
      }
    }
  }
  return resolvers
}

/**
 * Gets the field metadata for a given entity class.
 * @internal
 */
function getEntityFields(cls: AnyClass): FieldMeta[] {
  const sym = Symbol.metadata
  if (!sym) return []
  const meta = (cls as Record<symbol, unknown>)[sym] as
    | Record<symbol, unknown>
    | undefined
  if (!meta) return []
  return (meta[FIELD_METADATA] as FieldMeta[] | undefined) ?? []
}

// Export for testing
export { getEntityFields }
