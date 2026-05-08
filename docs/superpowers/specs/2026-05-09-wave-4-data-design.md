# Wave 4 — Data Design Specification

**Date:** 2026-05-09
**Status:** Approved (per master spec; user autonomy directive)
**Predecessor:** Wave 3 (`v0.6.0-canary.wave3`, 994 tests)
**Successor:** Wave 5 (OpenAPI Polish)

## 1. Scope

Ship 4 data-access packages closing the database gap with first-class Bun-native primitives:

| # | Package | Backed by |
|---|---|---|
| 1 | `@banhmi/postgres` | `Bun.sql` (native Postgres) |
| 2 | `@banhmi/mysql` | `Bun.sql` (native MySQL) |
| 3 | `@banhmi/drizzle` | Drizzle ORM (peer dep) wired into the framework |
| 4 | `@banhmi/mongo` | thin native MongoDB driver wrapper |

The existing `@banhmi/sqlite` (uses `bun:sqlite`) is unchanged but gets a small polish: parity with the new packages' `forRoot`/`forFeature` shape.

## 2. Cross-cutting design decisions

### 2.1 Module pattern

Each package exposes:
- `XxxModule.forRoot(opts)` — registers the connection / pool as a provider.
- `XxxModule.forFeature(entities)` — registers per-entity repositories (Postgres, MySQL, Mongo). Drizzle uses the schema-as-module pattern.
- `@InjectXxx()` token for the connection.
- `@Repository(Entity)` decorator (Postgres + MySQL + Mongo) for active-record-style typed repositories.

### 2.2 `@banhmi/postgres`

```ts
PostgresModule.forRoot({
  url?: string                                  // defaults to Bun.env.DATABASE_URL
  hostname?: string
  database?: string
  user?: string
  password?: string
  max?: number                                  // pool size
})
```

Provides `Sql` instance via DI. Use `Bun.sql` API (template-literal queries):

```ts
const users = await sql`SELECT * FROM users WHERE id = ${id}`
```

`@Repository(User)` provides typed `findById`, `findAll`, `insert`, `update`, `delete` against a tagged-template Postgres connection.

Transactions: `sql.begin(async tx => { await tx`INSERT...`; ... })`.

### 2.3 `@banhmi/mysql`

Parallel to postgres but with `Bun.sql` MySQL bindings (which Bun supports natively as of recent versions). API surface mirrors postgres.

### 2.4 `@banhmi/drizzle`

Drizzle is a peer dep (`drizzle-orm`). The package provides:
- `DrizzleModule.forRoot({ schema, driver, connection })` registers the typed `db` instance.
- `@InjectDb()` token for the configured drizzle instance.
- Migrate helper that drives `drizzle-kit`.
- Driver wrappers for `postgres-js`, `mysql2`, `bun:sqlite` (so users can pick).

For Wave 4: support `bun:sqlite` and `postgres-js` (= `Bun.sql`) drivers; `mysql2` is a stretch goal.

### 2.5 `@banhmi/mongo`

Thin wrapper around the official `mongodb` driver (peer dep). Provides:
- `MongoModule.forRoot({ url, database })` registers a `Db` instance.
- `@InjectMongo()` token.
- `@Repository(EntityClass)` returning a typed collection wrapper.
- Schema-less by default; users declare TS interfaces for typing.

## 3. Acceptance criteria

Same as previous waves: ≥ 90% line coverage, TSDoc on every public symbol with `@example`, micro-example with passing test, doc page MDX replaces placeholder, package re-exported from `packages/banhmi`. Tests should run with the underlying database mocked by default; integration tests gated behind `Bun.env.DATABASE_URL` / `Bun.env.MONGO_URL` env presence.

## 4. Cluster-app integration

Update `examples/drizzle-api/`:
- Replace inline drizzle setup with `@banhmi/drizzle`.
- Add an alternate boot flag that uses Postgres via `@banhmi/postgres` directly (no Drizzle) to demonstrate raw-SQL mode.
- Existing tests stay green; add new tests for the postgres path (skip if Postgres unavailable).

Add small cluster app `examples/cats-mongo/`:
- Drop-in replacement of cats-api using `@banhmi/mongo`.
- Demonstrates `@Repository(Cat)` patterns.

## 5. Verification gate

Same shape. Tag `v0.7.0-canary.wave4`.

## 6. Risks

| Risk | Mitigation |
|---|---|
| `Bun.sql` MySQL bindings may be unstable | Pin Bun version in CI; document compatibility |
| Drizzle integration is wide; many drivers | Ship `bun:sqlite` + `postgres-js` only this wave |
| Mongo driver is heavy; install size | Peer dep, not direct dep |
| Real DB tests are flaky in CI | Default to mocked unit tests; gate integration on env vars |

## 7. Out of scope

- TypeORM / MikroORM / Prisma integrations (Wave 6 patterns recipes).
- `@banhmi/redis` already exists; unchanged this wave.
- Migration tooling beyond drizzle-kit pass-through.
