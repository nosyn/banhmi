import type { GraphQLSchema } from 'graphql'

/**
 * Configuration for the complexity plugin.
 *
 * @example
 * const complexityConfig: ComplexityConfig = {
 *   maxComplexity: 100,
 *   defaultFieldComplexity: 1,
 * }
 */
export interface ComplexityConfig {
  /**
   * Maximum allowed complexity for a single query.
   * @default 1000
   */
  maxComplexity?: number
  /**
   * Default complexity cost per field when no explicit cost is set.
   * @default 1
   */
  defaultFieldComplexity?: number
}

/**
 * Result of {@link calculateQueryComplexity}.
 */
export interface ComplexityResult {
  /** Total calculated complexity. */
  complexity: number
  /** Whether the complexity exceeds the configured limit. */
  exceeded: boolean
  /** The configured max complexity. */
  max: number
}

/**
 * Calculates the complexity of a GraphQL query document.
 *
 * Fields decorated with `@Field({ complexity: N })` contribute `N` to the
 * total. All other fields contribute `defaultFieldComplexity` (default: 1).
 *
 * @param query - The parsed or string GraphQL query.
 * @param schema - The built GraphQL schema.
 * @param config - Complexity configuration.
 *
 * @example
 * const result = calculateQueryComplexity('{ cats { id name } }', schema)
 * if (result.exceeded) {
 *   throw new Error(`Query too complex: ${result.complexity} > ${result.max}`)
 * }
 */
export function calculateQueryComplexity(
  query: string,
  schema: GraphQLSchema,
  config: ComplexityConfig = {},
): ComplexityResult {
  const max = config.maxComplexity ?? 1000
  const defaultCost = config.defaultFieldComplexity ?? 1

  // Count field selections by walking the query document
  // This is a simplified cost model: each non-meta field costs defaultCost
  // unless the schema field has a complexity extension
  const fieldMatches = query.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\s*[({]?/g) ?? []
  const filteredFields = fieldMatches
    .map((f) => f.trim().replace(/[({]/g, '').trim())
    .filter((f) => !f.startsWith('__') && f.length > 0)

  let complexity = 0
  for (const fieldName of filteredFields) {
    // Look up field in schema to get complexity from extensions
    let fieldCost = defaultCost
    const queryType = schema.getQueryType()
    if (queryType) {
      const field = queryType.getFields()[fieldName]
      if (field) {
        const ext = field.extensions as Record<string, unknown> | undefined
        const cost = ext?.complexity
        if (typeof cost === 'number') {
          fieldCost = cost
        }
      }
    }
    complexity += fieldCost
  }

  return {
    complexity,
    exceeded: complexity > max,
    max,
  }
}

/**
 * Creates a validation rule function that rejects queries exceeding the complexity limit.
 *
 * @param schema - The GraphQL schema.
 * @param config - Complexity configuration.
 *
 * @example
 * const validateComplexity = createComplexityValidator(schema, { maxComplexity: 50 })
 * validateComplexity('{ cats { id name age } }') // throws if complexity > 50
 */
export function createComplexityValidator(
  schema: GraphQLSchema,
  config: ComplexityConfig = {},
): (query: string) => void {
  return (query: string) => {
    const result = calculateQueryComplexity(query, schema, config)
    if (result.exceeded) {
      throw new Error(
        `Query complexity ${result.complexity} exceeds the maximum allowed complexity of ${result.max}.`,
      )
    }
  }
}
