import { ARGS_METADATA } from '../metadata-keys'
import type { ArgMeta, FieldOptions } from '../types'

/**
 * Binds the entire arguments object to a resolver parameter.
 *
 * @param typeFn - Optional thunk returning the args type.
 *
 * @example
 * @Query(() => [Cat])
 * cats(@Args() args: CatsArgs) { ... }
 */
export function Args(
  nameOrTypeFn?: string | (() => unknown),
  options: FieldOptions = {},
) {
  return (
    _target: unknown,
    context: ClassMemberDecoratorContext,
    paramIndex: number,
  ): void => {
    const methodKey = String(context.name)
    const argName = typeof nameOrTypeFn === 'string' ? nameOrTypeFn : methodKey
    const typeFn =
      typeof nameOrTypeFn === 'function' ? nameOrTypeFn : () => Object

    const meta: ArgMeta = {
      name: argName,
      typeFn,
      index: paramIndex,
      options,
    }

    const existing =
      (context.metadata[ARGS_METADATA] as ArgMeta[] | undefined) ?? []
    // Store as nested: { [methodKey]: ArgMeta[] }
    const byMethod =
      (context.metadata[ARGS_METADATA] as
        | Record<string, ArgMeta[]>
        | undefined) ?? {}
    const methodArgs = byMethod[methodKey] ?? []
    const newByMethod = {
      ...byMethod,
      [methodKey]: [...methodArgs, meta],
    }
    context.metadata[ARGS_METADATA] = newByMethod
    void existing
  }
}

/**
 * Binds a single named argument to a resolver parameter.
 *
 * @param name - The argument name in the GraphQL schema.
 * @param typeFn - Optional thunk returning the arg type.
 * @param options - Optional field options.
 *
 * @example
 * @Query(() => Cat)
 * cat(@Arg('id') id: string) { ... }
 */
export function Arg(
  name: string,
  typeFn?: () => unknown,
  options: FieldOptions = {},
) {
  return (
    _target: unknown,
    context: ClassMemberDecoratorContext,
    paramIndex: number,
  ): void => {
    const methodKey = String(context.name)
    const meta: ArgMeta = {
      name,
      typeFn: typeFn ?? (() => String),
      index: paramIndex,
      options,
    }
    const byMethod =
      (context.metadata[ARGS_METADATA] as
        | Record<string, ArgMeta[]>
        | undefined) ?? {}
    const methodArgs = byMethod[methodKey] ?? []
    const newByMethod = {
      ...byMethod,
      [methodKey]: [...methodArgs, meta],
    }
    context.metadata[ARGS_METADATA] = newByMethod
  }
}

/**
 * Injects the resolver context object.
 *
 * @example
 * @Query(() => String)
 * hello(@Context() ctx: ResolverContext) {
 *   return ctx.request.headers.get('x-user') ?? 'World'
 * }
 */
export function Context() {
  return (
    _target: unknown,
    _context: ClassMemberDecoratorContext,
    _paramIndex: number,
  ): void => {
    // Context injection is handled by the schema builder at runtime
    // No metadata storage needed — detected by parameter index convention
  }
}

/**
 * Injects the GraphQL resolve info object.
 *
 * @example
 * @Query(() => String)
 * hello(@Info() info: GraphQLResolveInfo) { ... }
 */
export function Info() {
  return (
    _target: unknown,
    _context: ClassMemberDecoratorContext,
    _paramIndex: number,
  ): void => {
    // Info injection handled by schema builder
  }
}

/**
 * Injects the parent object in a field resolver.
 *
 * @example
 * @ResolveField(() => String)
 * fullName(@Parent() cat: Cat) { return cat.firstName + cat.lastName }
 */
export function Parent() {
  return (
    _target: unknown,
    _context: ClassMemberDecoratorContext,
    _paramIndex: number,
  ): void => {
    // Parent injection handled by schema builder
  }
}
