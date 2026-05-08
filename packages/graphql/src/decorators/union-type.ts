/**
 * Registry of union types created via {@link createUnionType}.
 * @internal
 */
export const unionRegistry = new Map<string, UnionTypeDefinition>()

/**
 * Options for {@link createUnionType}.
 *
 * @example
 * const SearchResult = createUnionType({
 *   name: 'SearchResult',
 *   types: () => [Cat, Dog],
 * })
 */
export interface CreateUnionTypeOptions {
  /** GraphQL name for the union type. */
  name: string
  /** Thunk returning the array of member types. */
  types: () => (new (...args: unknown[]) => unknown)[]
  /** Human-readable description. */
  description?: string
  /** Optional type resolver function. */
  resolveType?: (value: unknown) => string | null
}

/**
 * @internal
 */
export interface UnionTypeDefinition {
  name: string
  types: () => (new (...args: unknown[]) => unknown)[]
  description?: string
  resolveType?: (value: unknown) => string | null
}

/**
 * A branded sentinel used to reference a union type in a `@Field` thunk.
 * @internal
 */
export interface UnionTypeSentinel {
  readonly __unionName: string
}

/**
 * Creates and registers a named GraphQL union type.
 *
 * Returns a sentinel value that can be used in `@Field(() => SearchResult)`.
 *
 * @example
 * const SearchResult = createUnionType({
 *   name: 'SearchResult',
 *   types: () => [Cat, Dog],
 * })
 *
 * @Resolver()
 * class SearchResolver {
 *   @Query(() => SearchResult)
 *   search(): Cat | Dog { return new Cat() }
 * }
 */
export function createUnionType(
  options: CreateUnionTypeOptions,
): UnionTypeSentinel {
  const def: UnionTypeDefinition = {
    name: options.name,
    types: options.types,
    description: options.description,
    resolveType: options.resolveType,
  }
  unionRegistry.set(options.name, def)
  return { __unionName: options.name } as UnionTypeSentinel
}
