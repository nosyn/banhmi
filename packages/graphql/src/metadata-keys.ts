/**
 * Symbol-keyed metadata constants for GraphQL decorators.
 * All keys are private to the `@banhmi/graphql` package.
 * @internal
 */

/** Metadata key for @ObjectType() / @InterfaceType() / @InputType(). */
export const OBJECT_TYPE_METADATA = Symbol('graphql:object-type')

/** Metadata key for @Field() on a property. */
export const FIELD_METADATA = Symbol('graphql:fields')

/** Metadata key for @Resolver(). */
export const RESOLVER_METADATA = Symbol('graphql:resolver')

/** Metadata key for @Query() / @Mutation() / @Subscription(). */
export const OPERATIONS_METADATA = Symbol('graphql:operations')

/** Metadata key for @Args() / @Arg() parameter decorators. */
export const ARGS_METADATA = Symbol('graphql:args')

/** Metadata key for @Directive(). */
export const DIRECTIVE_METADATA = Symbol('graphql:directives')

/** Metadata key for @InterfaceType(). */
export const INTERFACE_TYPE_METADATA = Symbol('graphql:interface-type')

/** Metadata key for @InputType(). */
export const INPUT_TYPE_METADATA = Symbol('graphql:input-type')

/** Metadata key for registerEnumType. */
export const ENUM_METADATA = Symbol('graphql:enum')

/** Metadata key for createUnionType. */
export const UNION_METADATA = Symbol('graphql:union')

/** Metadata key for @Extensions(). */
export const EXTENSIONS_METADATA = Symbol('graphql:extensions')

/** Metadata key for @Key() (federation). */
export const FEDERATION_KEY_METADATA = Symbol('graphql:federation-key')
