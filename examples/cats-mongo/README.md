# Cats Mongo

A Banhmi CRUD API backed by MongoDB, demonstrating `@banhmi/mongo` with the
official `mongodb` driver. Manages a collection of cats and users stored in
a real MongoDB database.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- MongoDB 6+ running locally or a connection URI (Atlas, etc.)

## Quickstart

```bash
# From the repo root
bun install

# Set the connection URI (defaults to mongodb://localhost:27017/cats)
export MONGODB_URI="mongodb://localhost:27017/cats"

cd examples/cats-mongo
bun run dev
```

Server starts at `http://localhost:3000`.

## Key concepts demonstrated

- `MongoModule.forRoot` with `@banhmi/mongo`
- Repository pattern with `InjectCollection` injection token
- `ObjectId` handling and BSON type mapping
- Async provider lifecycle (`onModuleInit` / `onModuleDestroy`)
- Users sub-resource with relational queries

## Related docs

- [MongoDB](/techniques/mongo)
- [Asynchronous Providers](/fundamentals/asynchronous-providers)
- [Providers](/overview/providers)
