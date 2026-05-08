# Wave 4 — Data Summary

**Predecessor:** Wave 3 (Observability) — `v0.6.0-canary.wave3`
**Tag:** `v0.7.0-canary.wave4`

## Packages shipped (4)

- `@banhmi/postgres` — `Bun.SQL` Postgres adapter with `PostgresModule.forRoot`, `@Repository(Entity)`, `@InjectSql`.
- `@banhmi/mysql` — `Bun.SQL` MySQL adapter, parallel API; handles MySQL's lack of RETURNING with two-statement insert/update flows.
- `@banhmi/drizzle` — `DrizzleModule.forRoot({ driver })` with `sqliteDriver` (bun:sqlite) and `postgresJsDriver` shipped.
- `@banhmi/mongo` — `MongoModule.forRoot/forFeature`, `MongoRepository<T>`, `@InjectCollection`. Uses lazy-connect MongoClient.

## Cluster apps

- `examples/drizzle-api/` updated to use `@banhmi/drizzle` and demonstrate a `--mode=postgres-raw` alternate path.
- `examples/cats-mongo/` new — mirror of cats-api using `@banhmi/mongo`.

## Tests

1072 pass, 41 skip, 0 fail across 1113 tests in 171 files.

## Known follow-ups

- Pre-existing 6 `: any` violations in `packages/common/`.
- Route explorer trailing-slash quirk noted in drizzle-api work — investigate in Wave 6 patterns.
- Drizzle `mysql2` driver not shipped this wave; deferred (the Bun.sql MySQL adapter satisfies most needs).

## Verification gate

All gate commands exited 0 (or `quality:no-anys` reported only pre-existing).
