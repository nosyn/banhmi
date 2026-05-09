# GraphQL Demo

A code-first GraphQL API built with `@banhmi/graphql`. Demonstrates object types,
queries, mutations, subscriptions, and the auto-generated SDL — all from
TypeScript decorator definitions with no hand-written `.graphql` files.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- No external services required (data stored in memory)

## Quickstart

```bash
# From the repo root
bun install

cd examples/graphql-demo
bun run dev
```

Server starts at `http://localhost:3000`.
GraphQL Playground at `http://localhost:3000/graphql`.

## Key concepts demonstrated

- `GraphQLModule.forRoot` with `autoSchemaFile: true`
- `@ObjectType`, `@InputType`, `@Field` type definitions
- `@Query`, `@Mutation`, `@Resolver` decorators
- `@Subscription` with in-memory `PubSub`
- `@ResolveField` for computed fields
- Code-first SDL generation

## Related docs

- [GraphQL Quick Start](/graphql/quick-start)
- [Resolvers](/graphql/resolvers)
- [Mutations](/graphql/mutations)
- [Subscriptions](/graphql/subscriptions)
