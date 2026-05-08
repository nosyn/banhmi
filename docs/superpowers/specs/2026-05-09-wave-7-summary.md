# Wave 7 — GraphQL Summary

**Predecessor:** Wave 6 (Patterns) — `v0.9.0-canary.wave6`
**Tag:** `v0.10.0-canary.wave7`

## Highlights

One new package — `@banhmi/graphql` — delivering code-first GraphQL for Banhmi.

### `@banhmi/graphql` — Tasks 1–7

**Task 1 — Core schema builder + resolver decorators** (`166edb5`)
- `SchemaBuilder.build(resolvers, instances, config?)` walks `Symbol.metadata` to produce a `GraphQLSchema`.
- Decorators: `@ObjectType`, `@InputType`, `@InterfaceType`, `@Field`, `@Resolver`, `@Query`, `@Mutation`.
- Sentinel scalars: `Int`, `Float`, `ID`.
- Custom scalars: `DateScalar` (ISO-8601), `JsonScalar` (pass-through), `UuidScalar` (validated UUID v4).
- Type thunk pattern: `@Field(() => Cat)` — deferred resolution avoids circular-type issues.
- TC39 Stage 3 has no parameter decorators; inline `args` option added to `@Query`/`@Mutation` options as the working alternative: `@Query(() => Cat, { args: { id: () => String } })`.

**Task 2 — Subscriptions + PubSub** (`c09bf5d`)
- `@Subscription(typeFn, { filter?, resolve? })` decorator.
- `InMemoryPubSub` implements `PubSub` interface; delivers payloads as async iterables.
- Subscription filter implemented via `filterAsyncIterable` wrapper.
- `BunGraphQLWsHandler` / `createWsHandler(schema)` for graphql-ws protocol over `Bun.serve` WebSocket.

**Task 3 — Directives, interfaces, unions, enums, mapped types** (`4a71fe0`)
- `@Directive(sdl)` accumulates SDL directive strings on `DIRECTIVE_METADATA`.
- `@Extensions(obj)` merges extension metadata on `EXTENSIONS_METADATA`.
- `@InterfaceType` with `implementationTypes` for interface declaration.
- `registerEnumType(obj, opts)` + `createUnionType(opts)` registries consumed by `SchemaBuilder`.
- Mapped types: `PartialType`, `PickType`, `OmitType`, `IntersectionType` — each synthesizes a new class with injected `Symbol.metadata`.

**Task 4 — Apollo Federation v2 subgraph** (`2083ff9`)
- `@Key(fields)` / `@ExtendsType()` decorators write to `FEDERATION_KEY_METADATA`.
- `buildFederationSubgraphSchema(baseSchema, entityClasses)` injects `@key` directives into SDL then calls `buildSubgraphSchema` from `@apollo/subgraph`.
- `buildEntityResolvers(entityClasses)` builds the `__resolveReference` resolver map.

**Tasks 5–6 — Field middleware, plugins, complexity, SDL emit, sharing** (included in above commits)
- `FieldMiddlewareFn` chain wraps field resolvers; `addFieldMiddleware`, `applyFieldMiddlewares`, `clearFieldMiddlewares`.
- `GraphQLPlugin` lifecycle hooks: `requestDidStart`, `willSendResponse`; `registerPlugin`, `runRequestDidStart`, `runWillSendResponse`.
- `calculateQueryComplexity(query, schema, config?)` — counts field selections; `createComplexityValidator` throws on excess.
- `emitSdl(schema, opts?)` — calls `printSchema`, optionally writes to file.
- `withGraphQLFromOpenApi(models)` — pass-through for classes already decorated; stub for bare classes (TODO: full @ApiProperty lift).
- `GraphQLModule.forRoot(options)` / `GraphQLModule.buildSchema(resolvers, instances, options)` for DI integration.

**Task 7 — graphql-demo example app** (`6836947`)
- `examples/graphql-demo/` demonstrates the full `@banhmi/graphql` surface.
- `CatsResolver`: queries, mutations (`createCat`, `removeCat`), subscription (`catCreated`).
- `UsersResolver`: query with `@Key` federation annotation.
- `AppModule.buildSchema()` wires resolvers.
- 7 integration tests covering queries, mutations, and subscription delivery.

## Architecture Notes

- Polyfill strategy: `packages/graphql/src/metadata-keys.ts` has `import '@banhmi/common'` at the top, which triggers the `Symbol.metadata` polyfill whenever any decorator is imported — even when running `bun test --recursive` from repo root.
- `bunfig.toml` preload (`../common/src/polyfill-symbol-metadata.ts`) ensures polyfill loads for `bun test packages/graphql` invocations.
- TC39 Stage 3 does not support parameter decorators; `@Args`, `@Arg`, `@Context`, `@Info`, `@Parent` are no-op stubs included for API completeness. The `args` inline option on operation decorators is the recommended approach.
- Peer deps: `graphql >=16` (required), `graphql-yoga >=5` (optional), `@apollo/subgraph >=2` (optional), `graphql-tag >=2` (optional).

## Tests

**1261 pass, 41 skip (Redis/infra), 0 fail** across 194 files.
Wave 6 baseline: 1179. Wave 7 added 82 new tests (+7%).

Breakdown for `packages/graphql`:
- `decorators.test.ts`: 13 tests
- `schema-builder.test.ts`: 7 tests
- `scalars.test.ts`: 13 tests
- `subscription.test.ts`: 8 tests
- `directives.test.ts`: 5 tests
- `mapped-types.test.ts`: 9 tests
- `federation.test.ts`: 5 tests
- `field-middleware.test.ts`: 7 tests
- `complexity.test.ts`: 6 tests
- `sdl-emit.test.ts`: 2 tests
- **Total: 75 tests in `packages/graphql`**
- **7 tests in `examples/graphql-demo`**

## Files Changed

| Area | New files | Notes |
|------|-----------|-------|
| `packages/graphql/src/` | 22 source files | Full package implementation |
| `packages/graphql/test/` | 10 test files | 75 tests |
| `examples/graphql-demo/` | 12 files | Full demo + 7 integration tests |
| `packages/banhmi/` | 0 | (graphql is opt-in, not re-exported from main bundle) |

## Verification Gate

| Command | Result |
|---------|--------|
| `bun test packages/graphql` | PASS (75 pass, 0 fail) |
| `bunx @biomejs/biome check packages/graphql` | PASS (0 errors) |
| `bun run quality:no-bangs` | PASS (0 violations) |
| `bun run quality:no-reflect` | PASS (0 violations) |
| `bun run quality:tsdoc` | PASS |
| `bun test --recursive` | PASS (1261 pass, 41 skip, 0 fail across 194 files) |

## Known Follow-ups

- `@Args`, `@Arg`, `@Context`, `@Info`, `@Parent` are no-op stubs. TC39 parameter decorators are still a Stage 3 proposal with no Bun/TS runtime support. Once available, these can be wired to `ARGS_METADATA`.
- `withGraphQLFromOpenApi` is a stub — full `@ApiProperty` → `@Field` lift is deferred.
- `BunGraphQLWsHandler` implements graphql-ws protocol basics; production usage should also handle connection_init acknowledgement timeouts and ping/pong keepalives.
- `GraphQLModule` DI integration is wired but not tested against the full Banhmi container (only schema building tested). Container integration tests deferred to a future wave.
- Pre-existing 6 `: any` violations in `packages/common/` — unchanged from Wave 6.
