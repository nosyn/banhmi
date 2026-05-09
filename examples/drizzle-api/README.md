# Drizzle API

A Banhmi REST API using Drizzle ORM with PostgreSQL (or SQLite for local dev)
as the data store. Demonstrates type-safe schema definition, migrations,
and query building inside a Banhmi DI context.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- PostgreSQL 15+ (or use SQLite for local testing — `bun run dev` defaults to SQLite)

## Quickstart

```bash
# From the repo root
bun install

# Optional: set a Postgres URL (defaults to SQLite ./dev.db)
export DATABASE_URL="postgres://user:pass@localhost:5432/drizzle_demo"

cd examples/drizzle-api
bun run db:push   # push schema to database
bun run dev
```

Server starts at `http://localhost:3000`.

## Key concepts demonstrated

- `DrizzleModule.forRoot` with `@banhmi/drizzle`
- Type-safe schema definition with `drizzle-orm`
- `db:push` for schema sync (Drizzle Kit)
- `db:studio` for the Drizzle visual editor
- Repository pattern injecting the Drizzle `db` instance
- Async provider initialisation

## Related docs

- [Drizzle ORM](/techniques/drizzle)
- [Asynchronous Providers](/fundamentals/asynchronous-providers)
- [Configuration](/techniques/configuration)
