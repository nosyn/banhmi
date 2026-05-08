import { Token } from '@banhmi/common'
import type { GraphQLOptions } from './types'

/**
 * Injection token for the {@link GraphQLOptions} configuration object.
 *
 * @example
 * // In a provider:
 * { provide: GRAPHQL_OPTIONS, useValue: { resolvers: [] } }
 */
export const GRAPHQL_OPTIONS = Token<GraphQLOptions>('GRAPHQL_OPTIONS')
