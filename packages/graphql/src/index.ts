/**
 * `@banhmi/graphql` — code-first GraphQL for Banhmi.
 *
 * Provides decorators, schema builder, scalars, subscriptions, directives,
 * mapped types, and (optionally) Federation v2 support.
 *
 * @example
 * import { GraphQLModule, ObjectType, Field, Resolver, Query } from '@banhmi/graphql'
 *
 * @ObjectType()
 * class Cat {
 *   @Field(() => ID) id!: string
 *   @Field() name!: string
 * }
 *
 * @Resolver(() => Cat)
 * class CatResolver {
 *   @Query(() => [Cat])
 *   cats() { return [] }
 * }
 */

export type {
  CreateUnionTypeOptions,
  RegisterEnumOptions,
  UnionTypeSentinel,
} from './decorators'
export {
  Arg,
  Args,
  Context,
  createUnionType,
  Field,
  Float,
  ID,
  Info,
  InputType,
  Int,
  InterfaceType,
  Mutation,
  ObjectType,
  Parent,
  Query,
  Resolver,
  registerEnumType,
  Subscription,
} from './decorators'
export { Directive } from './decorators/directive'
export { Extensions } from './decorators/extensions'
export { GraphQLModule } from './graphql.module'
export {
  IntersectionType,
  OmitType,
  PartialType,
  PickType,
} from './mapped-types'
export type { PubSub } from './pubsub'
export { InMemoryPubSub } from './pubsub'
export { DateScalar, JsonScalar, UuidScalar } from './scalars'
export { SchemaBuilder } from './schema-builder'
export type {
  FieldOptions,
  GraphQLOptions,
  InputTypeOptions,
  ObjectTypeOptions,
  ResolverContext,
  SubscriptionOptions,
} from './types'
