# Wave 7 — GraphQL Implementation Plan

**Predecessor:** Wave 6 (Patterns) — `v0.9.0-canary.wave6`, 1179 tests.
**Goal:** Ship `@banhmi/graphql` with code-first + schema-first parity vs `@nestjs/graphql`.

## Scope

One package, broad feature surface. Tasks split by feature group rather than by package count.

1. Core: schema building, resolvers, types, scalars.
2. Mutations + subscriptions (WebSocket transport).
3. Directives, interfaces, unions, enums.
4. Federation v2 (subgraphs + gateway).
5. Field middleware, mapped types, plugins, complexity, extensions.
6. CLI plugin (auto field decoration), SDL emit, sharing models with `@banhmi/openapi`.
7. Cluster app `examples/graphql-demo/`.
8. Verification gate + canary.

**Tech Stack:** `graphql` (peer dep, 16+), `graphql-yoga` for the HTTP transport (peer dep). `Bun.serve` for the WS server (subscriptions). Optional `@apollo/subgraph` peer dep for federation.

**Cross-task conventions:** identical to prior waves. `static inject = [...] as const`, `Symbol.metadata`, no `: any`/`!`/`reflect-metadata`.

---

## Task 1 — Core: schema, resolvers, types, scalars

```
packages/graphql/
  package.json (peerDeps: graphql >= 16, graphql-yoga >= 5)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/graphql.module.ts
  src/decorators/{object-type,field,resolver,query,mutation,args,arg,context,info,parent}.ts
  src/decorators/{int-scalar,float-scalar,id-scalar,subscription}.ts
  src/scalars/{date,json,uuid}.ts
  src/schema-builder/index.ts                  # walks Symbol.metadata to build a GraphQLSchema
  src/schema-builder/types.ts
  src/types.ts
  src/tokens.ts
  test/schema-builder.test.ts
  test/decorators.test.ts
  test/integration.test.ts                     # boots a Yoga server, runs queries
```

Public API (Task 1 portion):

```ts
export { GraphQLModule } from './graphql.module'
export {
  ObjectType, Field, Resolver, Query, Mutation, Args, Arg, Context, Info, Parent,
  Int, Float, ID, registerEnumType, createUnionType, InterfaceType,
} from './decorators'
export { DateScalar, JsonScalar, UuidScalar } from './scalars'
export type { GraphQLOptions, ResolverContext, FieldOptions, ObjectTypeOptions } from './types'
```

```ts
@ObjectType()
class Cat {
  @Field(() => ID) id!: string
  @Field() name!: string
  @Field(() => Int, { nullable: true }) age?: number
}

@Resolver(() => Cat)
class CatResolver {
  static inject = [CatService] as const
  constructor(private cats: CatService) {}

  @Query(() => [Cat])
  async cats() { return this.cats.findAll() }

  @Mutation(() => Cat)
  async createCat(@Args('input') input: CreateCatInput) { return this.cats.create(input) }
}
```

`GraphQLModule.forRoot({ resolvers, autoSchemaFile?, federation? })` builds a schema from registered resolver classes, mounts a `graphql-yoga` server (HTTP) at `path` (default `/graphql`).

Tests:
- Schema builder produces correct SDL from decorated classes.
- Query / Mutation execute through the resolver.
- Built-in scalars round-trip values.
- Enum + union types register correctly.

Commit: `feat(graphql): add core schema builder + resolver decorators`

---

## Task 2 — Mutations and subscriptions

Add subscription support via WebSocket transport. Use `graphql-ws`-compatible protocol over `Bun.serve`'s native WS.

Files added:

```
src/decorators/subscription.ts
src/pubsub/index.ts                # in-memory PubSub + Redis adapter
src/transport/ws.ts                # WS server bridging native Bun.serve
test/subscription.test.ts
```

```ts
@Resolver()
class CommentResolver {
  static inject = [PubSub] as const
  constructor(private pubsub: PubSub) {}

  @Subscription(() => Comment, { filter: (payload, vars) => payload.postId === vars.postId })
  commentAdded(@Args('postId') postId: string) {
    return this.pubsub.asyncIterator(`comments.${postId}`)
  }
}
```

`PubSub` interface: `publish(topic, payload)`, `asyncIterator(topics)`. Default in-memory implementation. `RedisPubSub` adapter via `@banhmi/redis`.

Tests:
- `Mutation` returns the new value.
- `Subscription` over WS receives published events.
- Filter excludes non-matching events.

Commit: `feat(graphql): add subscriptions with WS transport and PubSub`

---

## Task 3 — Directives, interfaces, unions, enums, mapped types

Files:

```
src/decorators/directive.ts
src/decorators/interface-type.ts
src/decorators/union-type.ts
src/decorators/enum-type.ts
src/mapped-types/{partial,pick,omit,intersection}.ts
test/directives.test.ts
test/mapped-types.test.ts
```

`@Directive('@deprecated(reason: "...")')` on a field. `@InterfaceType()` for shared interfaces. `createUnionType({ name, types })`. `registerEnumType(EnumObj, { name })`.

Mapped types: `PartialType(Cat)`, `PickType(Cat, ['id', 'name'])`, `OmitType(Cat, ['age'])`, `IntersectionType(A, B)`.

Tests cover each.

Commit: `feat(graphql): add directives, interfaces, unions, enums, mapped types`

---

## Task 4 — Federation v2

Subgraph support via `@apollo/subgraph` peer dep.

Files:

```
src/federation/{subgraph,gateway}.ts
src/decorators/{key,external,extends-type}.ts
test/federation.test.ts
```

```ts
@ObjectType()
@Key('id')
class User { @Field(() => ID) id!: string; @Field() email!: string }
```

`buildSubgraphSchema()` produces a schema compatible with Apollo Federation v2.

Gateway side: `@banhmi/graphql/gateway` exports a small wrapper that composes multiple subgraphs (a real federation gateway is typically run separately; we provide a thin convenience wrapper).

Tests: subgraph schema includes federation directives; introspection reports the right entities.

Commit: `feat(graphql): add Apollo Federation v2 subgraph + gateway support`

---

## Task 5 — Field middleware, plugins, complexity, extensions

Files:

```
src/middleware/{index,field-middleware}.ts
src/plugin/index.ts
src/complexity/index.ts
src/extensions/index.ts
test/field-middleware.test.ts
test/complexity.test.ts
```

`@FieldMiddleware()` adds a wrapper around field resolution.
Plugin API: `{ requestDidStart(ctx), willSendResponse(ctx) }` lifecycle hooks.
Complexity: `@Field({ complexity: 5 })`; query rejected if total > limit.
Extensions: `@Extensions({ key: value })` arbitrary metadata.

Tests cover each.

Commit: `feat(graphql): add field middleware, plugins, complexity, extensions`

---

## Task 6 — CLI plugin, SDL emit, sharing models

Files:

```
cli/src/transform.ts                # auto @Field() inference
cli/src/plugin.ts
src/sdl/emit.ts
src/sharing/index.ts                # consumes @banhmi/openapi's generateSdl
test/cli-transform.test.ts
test/sdl-emit.test.ts
```

CLI plugin: parallel to `@banhmi/openapi`'s — auto-decorate class properties with `@Field()` based on TS types.

SDL emit: `printSchema(schema): string` from a built schema.

Sharing: `withGraphQLFromOpenApi([CatModel])` lifts OpenAPI-decorated models into `@ObjectType()` classes.

Commit: `feat(graphql): add CLI plugin, SDL emit, openapi-graphql model sharing`

---

## Task 7 — Cluster app `examples/graphql-demo/`

```
examples/graphql-demo/
  package.json
  bunfig.toml
  README.md
  src/main.ts
  src/app.module.ts
  src/cats/cats.types.ts                # @ObjectType Cat, @InputType CreateCatInput
  src/cats/cats.resolver.ts             # Query + Mutation + Subscription
  src/cats/cats.service.ts
  src/users/users.types.ts              # for federation demo
  src/users/users.resolver.ts
  src/federation/subgraph-cats.ts       # exports a subgraph
  test/integration.test.ts              # query, mutation, subscription, federation
```

Demonstrates: code-first schema, Q/M/S, federation subgraph, mapped types, directives.

Commit: `feat(graphql-demo): add cluster app demonstrating full @banhmi/graphql surface`

---

## Task 8 — Wave 7 verification gate + canary

Standard. Tag `v0.10.0-canary.wave7`. Summary at `docs/superpowers/specs/2026-05-09-wave-7-summary.md`.

If any peer dep (`graphql`, `graphql-yoga`, `@apollo/subgraph`) doesn't install cleanly under Bun, document and ship the fewest features needed for the gate to pass; defer the rest with TODOs. The wave is too big to gate on every feature being present; aim for the core (Tasks 1-3) being shipped and tests green; later tasks can carry "TODO" markers documented in the summary.
