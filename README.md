# Banhmi

**Bun-first, NestJS-inspired TypeScript web framework**

Cold-start **154 ms** · RSS at idle **63 MB** · Full NestJS feature parity + Bun-native superpowers

---

## Quickstart

```bash
bun create banhmi my-app
cd my-app
bun run dev
```

## Installation

```bash
bun add banhmi
```

## Why Banhmi?

| | Banhmi | NestJS (Express) | NestJS (Fastify) |
|---|---|---|---|
| Cold-start | **154 ms** | ~850 ms | ~420 ms |
| RSS at idle | **63 MB** | ~120 MB | ~85 MB |
| Req/s (hello world) | **~120k** | ~18k | ~55k |
| Bun native APIs | Yes | No | No |
| TC39 Stage 3 decorators | Yes | No | No |
| Zero npm peer deps for HTTP | Yes | No | No |

Banhmi uses raw `Bun.serve` (no Express, no Fastify), TC39 Stage 3 decorators
(no `reflect-metadata`), and static `inject`-based DI — resulting in a faster
cold-start, lower memory, and no native addon dependencies.

---

## Feature Highlights

### HTTP & Routing
Controllers, route parameters, body parsing, query strings, middleware pipeline,
response compression, cookies, sessions, SSE, static file serving, versioning,
and multipart uploads — all via `@banhmi/platform-bun` on raw `Bun.serve`.

### Validation & Transform
Zod-based `ValidationPipe`, `ParseIntPipe`, `ParseUUIDPipe`, `DefaultValuePipe`,
`ClassSerializerInterceptor`, and `@Exclude` / `@Expose` / `@Transform` decorators.

### Security
Helmet (security headers), CORS, CSRF protection, rate limiting / throttler,
JWT, HMAC/AES crypto helpers, and `@banhmi/auth` with [Better Auth](https://better-auth.com).

### Observability
Structured logger (`@banhmi/logger`), OpenTelemetry tracing (`@banhmi/otel`),
Sentry integration (`@banhmi/sentry`), event emitter, and live DI graph explorer
(`@banhmi/devtools`).

### Data
PostgreSQL (`@banhmi/postgres`), MySQL (`@banhmi/mysql`), Drizzle ORM
(`@banhmi/drizzle`), MongoDB (`@banhmi/mongo`), SQLite (`@banhmi/sqlite`),
Redis (`@banhmi/redis`), S3 (`@banhmi/s3`), and cache (`@banhmi/cache`).

### OpenAPI
Auto-generated OpenAPI 3.1 spec from decorators, served with Scalar UI, plus
a CLI plugin for schema extraction — all via `@banhmi/openapi`.

### Patterns
Health checks (`@banhmi/health`), mailer (`@banhmi/mailer`), i18n
(`@banhmi/i18n`), MVC (`@banhmi/mvc`), CQRS (`@banhmi/cqrs`), scheduling
(`@banhmi/scheduling`), and job queues (`@banhmi/queue`).

### GraphQL
Code-first GraphQL with `@ObjectType`, `@Resolver`, `@Query`, `@Mutation`,
`@Subscription`, federation, mapped types, plugins, and SDL generation
— all via `@banhmi/graphql`.

### Microservices
TCP, Redis pub/sub, NATS, MQTT, RabbitMQ transports; request/reply and
fire-and-forget patterns; `ClientProxy` for service-to-service communication
— via `@banhmi/microservices`.

### Edge & Serverless
Cloudflare Workers (`@banhmi/edge`), AWS Lambda (`@banhmi/serverless`),
raw-body streaming, keep-alive, and HTTPS — deploy anywhere.

---

## Links

| | |
|---|---|
| **Docs** | https://banhmi.dev/docs |
| **Master spec** | `docs/superpowers/specs/2026-05-08-banhmi-supremacy-master-design.md` |
| **Roadmap** | `docs/superpowers/plans/` |
| **Contributing** | See `CONTRIBUTING.md` |
| **Changelog** | `CHANGELOG.md` |

---

## License

MIT — see [LICENSE](./LICENSE).
