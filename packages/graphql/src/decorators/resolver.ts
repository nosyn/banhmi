import { OPERATIONS_METADATA, RESOLVER_METADATA } from '../metadata-keys'
import type { FieldOptions, OperationMeta, ResolverMeta } from '../types'

/**
 * Marks a class as a GraphQL resolver.
 *
 * @param typeFn - Optional thunk returning the Object Type this resolver handles.
 *
 * @example
 * @Resolver(() => Cat)
 * class CatResolver {
 *   @Query(() => [Cat])
 *   cats() { return [] }
 * }
 */
export function Resolver(typeFn?: () => unknown) {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    const meta: ResolverMeta = {
      typeFn: typeFn ?? null,
    }
    context.metadata[RESOLVER_METADATA] = meta
  }
}

function addOperation(
  kind: 'query' | 'mutation' | 'subscription',
  typeFn: () => unknown,
  options: FieldOptions,
) {
  return (_target: unknown, context: ClassMemberDecoratorContext): void => {
    const methodKey = String(context.name)
    const op: OperationMeta = {
      kind,
      typeFn,
      options,
      methodKey,
      args: [],
    }
    const existing =
      (context.metadata[OPERATIONS_METADATA] as OperationMeta[] | undefined) ??
      []
    context.metadata[OPERATIONS_METADATA] = [...existing, op]
  }
}

/**
 * Marks a resolver method as a GraphQL query.
 *
 * @param typeFn - Thunk returning the return type.
 * @param options - Optional field options.
 *
 * @example
 * @Query(() => [Cat])
 * async cats() { return this.catsService.findAll() }
 */
export function Query(typeFn: () => unknown, options: FieldOptions = {}) {
  return addOperation('query', typeFn, options)
}

/**
 * Marks a resolver method as a GraphQL mutation.
 *
 * @param typeFn - Thunk returning the return type.
 * @param options - Optional field options.
 *
 * @example
 * @Mutation(() => Cat)
 * async createCat(@Args('input') input: CreateCatInput) {
 *   return this.catsService.create(input)
 * }
 */
export function Mutation(typeFn: () => unknown, options: FieldOptions = {}) {
  return addOperation('mutation', typeFn, options)
}
