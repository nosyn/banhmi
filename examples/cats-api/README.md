# Cats API

A classic CRUD REST API demonstrating Banhmi's HTTP layer. The app manages a
collection of cats with full Create/Read/Update/Delete operations, input
validation via Zod, versioned routes, cookies, compression, and an
auto-generated OpenAPI spec served with Scalar UI.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- No external services required (data stored in memory)

## Quickstart

```bash
# From the repo root (dependencies are hoisted)
bun install

cd examples/cats-api
bun run dev
```

Server starts at `http://localhost:3000`.
OpenAPI (Scalar UI) at `http://localhost:3000/api`.

## Key concepts demonstrated

- `@Controller` / `@Get` / `@Post` / `@Put` / `@Delete` route handlers
- `@Body` + `ZodValidationPipe` for request validation
- `@Param` / `@Query` parameter extraction
- Route versioning (`/v1/cats`, `/v2/cats`) via `@banhmi/versioning`
- Cookie read/write via `@banhmi/cookies`
- Response compression via `@banhmi/compression`
- OpenAPI decorator (`@ApiProperty`, `@ApiOperation`) with Scalar UI
- Event emission via `@banhmi/events`
- Session middleware

## Related docs

- [Controllers](/overview/controllers)
- [Validation](/techniques/validation)
- [OpenAPI Overview](/openapi/overview)
- [Versioning](/techniques/versioning)
