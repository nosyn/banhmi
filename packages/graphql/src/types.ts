/**
 * Options for {@link GraphQLModule.forRoot}.
 *
 * @example
 * GraphQLModule.forRoot({
 *   resolvers: [CatResolver],
 *   path: '/graphql',
 * })
 */
export interface GraphQLOptions {
  /** Resolver classes to register with the schema builder. */
  resolvers: (new (
    ...args: unknown[]
  ) => unknown)[]
  /**
   * HTTP path to mount the GraphQL endpoint.
   * @default '/graphql'
   */
  path?: string
  /**
   * Whether to enable GraphQL playground / introspection.
   * @default true in development
   */
  playground?: boolean
  /**
   * Enable Apollo Federation v2 mode.
   * @default false
   */
  federation?: boolean
  /**
   * Output path for SDL file generation (optional).
   * When set, the schema SDL is written to this path on startup.
   */
  autoSchemaFile?: string
}

/**
 * Context object available in every resolver method via {@link Context} decorator.
 *
 * @example
 * @Query(() => String)
 * hello(@Context() ctx: ResolverContext) {
 *   return ctx.request.headers.get('x-user')
 * }
 */
export interface ResolverContext {
  /** The raw HTTP request. */
  request: Request
  /** Additional context properties injected by plugins or middleware. */
  [key: string]: unknown
}

/**
 * Inline argument definition for use with `@Query` / `@Mutation`.
 *
 * Alternative to parameter decorators (which are not part of TC39 Stage 3).
 * Declare args inline in the operation decorator.
 *
 * @example
 * @Query(() => Cat, { nullable: true, args: { id: () => String } })
 * cat(args: { id: string }) { return this.service.findById(args.id) }
 */
export type InlineArgDefs = Record<string, () => unknown>

/**
 * Options for the {@link Field} decorator.
 *
 * @example
 * @Field(() => String, { nullable: true, description: 'Cat name' })
 * name?: string
 */
export interface FieldOptions {
  /** Whether the field can be null. */
  nullable?: boolean
  /** Human-readable description shown in the schema. */
  description?: string
  /** Deprecation reason (adds `@deprecated` directive). */
  deprecationReason?: string
  /** Complexity cost for this field (used by complexity plugin). */
  complexity?: number
  /** Whether this field is a list. */
  isList?: boolean
  /**
   * Inline argument definitions for use with `@Query` / `@Mutation`.
   * Alternative to `@Arg` parameter decorators (TC39 Stage 3 has no param decorators).
   *
   * @example
   * @Query(() => Cat, { nullable: true, args: { id: () => String } })
   * cat(args: { id: string }) { return this.service.findById(args.id) }
   */
  args?: InlineArgDefs
}

/**
 * Options for the {@link ObjectType} decorator.
 *
 * @example
 * @ObjectType({ description: 'A cat entity' })
 * class Cat {}
 */
export interface ObjectTypeOptions {
  /** Human-readable description for the type. */
  description?: string
  /** Custom name for the GraphQL type (defaults to class name). */
  name?: string
  /** Whether this is an input type. */
  isAbstract?: boolean
}

/**
 * Options for the {@link InputType} decorator.
 *
 * @example
 * @InputType({ description: 'Input for creating a cat' })
 * class CreateCatInput {}
 */
export interface InputTypeOptions {
  /** Human-readable description for the input type. */
  description?: string
  /** Custom name for the GraphQL input type (defaults to class name). */
  name?: string
}

/**
 * Options for the {@link Subscription} decorator.
 *
 * @example
 * @Subscription(() => Comment, {
 *   filter: (payload, vars) => payload.postId === vars.postId,
 * })
 * commentAdded() {}
 */
export interface SubscriptionOptions {
  /**
   * Filter function. Called with (payload, variables, context).
   * Returns true to deliver the event to the subscriber.
   */
  filter?: (
    payload: unknown,
    variables: Record<string, unknown>,
    context: ResolverContext,
  ) => boolean | Promise<boolean>
  /** Resolve function to transform payload before delivering. */
  resolve?: (payload: unknown) => unknown
  /** Description shown in the schema. */
  description?: string
  /** Whether the result is nullable. */
  nullable?: boolean
}

/**
 * Internal metadata shape stored on a field-decorated property.
 * @internal
 */
export interface FieldMeta {
  /** Thunk returning the field's GraphQL type. */
  typeFn: () => unknown
  /** Field-level options. */
  options: FieldOptions
  /** Property key on the class. */
  propertyKey: string
  /** Whether this is an argument (for @Arg). */
  isArg?: boolean
}

/**
 * Internal metadata shape stored on a resolver class via {@link Resolver}.
 * @internal
 */
export interface ResolverMeta {
  /** Thunk returning the type this resolver handles. */
  typeFn: (() => unknown) | null
}

/**
 * Internal metadata shape for a query / mutation / subscription method.
 * @internal
 */
export interface OperationMeta {
  /** The kind of operation. */
  kind: 'query' | 'mutation' | 'subscription'
  /** Thunk returning the return type. */
  typeFn: () => unknown
  /** Options (nullable, description, ...). */
  options: FieldOptions & SubscriptionOptions
  /** The method name on the resolver class. */
  methodKey: string
  /** Argument metas for this method. */
  args: ArgMeta[]
}

/**
 * Internal metadata for a single @Arg-decorated parameter.
 * @internal
 */
export interface ArgMeta {
  /** Argument name in the GraphQL schema. */
  name: string
  /** Thunk returning the arg's type. */
  typeFn: () => unknown
  /** Index of the parameter in the method signature. */
  index: number
  /** Options for the argument. */
  options: FieldOptions
}
