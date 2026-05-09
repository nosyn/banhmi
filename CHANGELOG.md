# Changelog

All notable changes to Banhmi are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version numbers follow [Semantic Versioning](https://semver.org/).

---

## [1.0.0-rc.1] — 2026-05-09

### Added
- **Polish & Release** (Wave 12): all placeholder MDX docs replaced with real content, 41 broken internal links fixed, link-checker script at `scripts/quality/links.ts`, all example READMEs standardised, top-level `README.md` rewritten with marquee benchmark numbers, docs landing page rebuilt with feature grid.
- Canary tag `v1.0.0-rc.1` marks the start of the 7-day soak window before GA.

### Changed
- All public packages bumped from `0.x` canary to `1.0.0-rc.1`.

---

## [0.14.0-canary.wave11] — 2026-05-09

### Added
- **Benchmarks** (Wave 11): full comparative benchmark suite vs NestJS@Express, NestJS@Fastify, Hono, and Elysia across seven scenarios (hello, json-roundtrip, validation, file-upload, ws-throughput, db-cats, cold-start, rss-idle).
- `benchmarks/scenarios/` expanded: `json-roundtrip`, `validation`, `file-upload`, `ws-throughput`, `db-cats`, `cold-start`, `rss`.
- `benchmarks/runners/`: `bombardier.ts`, `autocannon.ts`, `cold-start.ts`, `rss.ts` alongside existing `oha.ts`.
- Hono and Elysia competitor baselines under `benchmarks/competitors/`.
- Live results published at `performance/results.mdx`: Banhmi wins all scenarios — 154 ms cold-start, 63 MB RSS, ~120 k req/s.

---

## [0.13.0-canary.wave10] — 2026-05-09

### Added
- **Migration & Quality** (Wave 10): NestJS-to-Banhmi migration guide (`migration/concepts`, `migration/codemods`, `migration/compat`).
- `scripts/codemods/nestjs-to-banhmi.ts` — automated source rewriter for common NestJS imports and decorator patterns.
- Production checklist at `production/index.mdx` covering env vars, security headers, TLS, graceful shutdown, OTel, Sentry, and container best practices.
- Security audit of `@banhmi/auth`, `@banhmi/security`, `@banhmi/crypto`, `@banhmi/cookies`, `@banhmi/session`, `@banhmi/jwt`; all high-severity findings resolved.

### Fixed
- All 6 pre-existing `: any` violations in `packages/common/src/` replaced with typed alternatives; `quality:no-anys` gate now clean.

---

## [0.12.0-canary.wave9] — 2026-05-09

### Added
- **Edge & Serverless** (Wave 9): `@banhmi/edge` — `createEdgeHandler(AppModule)` for Cloudflare Workers, Vercel Edge, and Deno Deploy.
- `@banhmi/serverless` — `createLambdaHandler(AppModule)` for AWS Lambda API Gateway v1/v2.
- Hybrid-app support: `BanhmiApplication.connectMicroservice()` and `app.startAllMicroservices()`.
- HTTPS via `Bun.serve({ tls })` through `BanhmiFactory.create(AppModule, { https: { key, cert } })`.
- Raw-body access (`request.rawBody: Uint8Array`) via `RawBodyParserPipe`.
- Keep-alive and per-socket timeout knobs exposed through factory options.
- Hot-reload guide and `BanhmiHmrModule` for invalidating singletons in dev mode.
- Request lifecycle diagram in `deployment/request-lifecycle.mdx`.
- Cluster apps: `examples/edge-worker/` and `examples/lambda-app/`.

---

## [0.11.0-canary.wave8] — 2026-05-09

### Added
- **Microservices** (Wave 8): `@banhmi/microservices` with `@MessagePattern`, `@EventPattern`, `ClientProxy`, and `MicroserviceModule.forRoot`.
- Transports — Tier A: TCP (`Bun.listen`/`Bun.connect`), Redis pub/sub, custom transport, in-memory (deterministic testing).
- Transports — Tier B: NATS, MQTT, RabbitMQ (optional peer deps).
- Transports — Tier C: Kafka and gRPC stubs (heavy peer deps, documented compatibility notes).
- Enhancer support: exception filters, pipes, guards, and interceptors compose on inbound microservice messages.
- `InMemoryTransport` for deterministic unit tests without running a broker.
- Cluster app `examples/microservices-demo/`.

---

## [0.10.0-canary.wave7] — 2026-05-09

### Added
- **GraphQL** (Wave 7): `@banhmi/graphql` code-first schema, resolvers, mutations, subscriptions (WS transport via `Bun.serve`), scalars, directives, interfaces, unions, enums, field middleware, mapped types, plugins, complexity, extensions.
- Federation v2 subgraph support via optional `@apollo/subgraph` peer dep.
- CLI plugin for auto `@Field()` inference.
- SDL export helper.
- `examples/graphql-demo/` cluster app.

---

## [0.9.0-canary.wave6] — 2026-05-09

### Added
- **Patterns** (Wave 6): `@banhmi/mvc` (Eta + Edge.js view engines), `@banhmi/health` (Terminus-parity health checks), `@banhmi/mailer` (SMTP via nodemailer-compatible API), `@banhmi/i18n` (locale resolvers), `@banhmi/cqrs` (commands, queries, events, sagas).

---

## [0.8.0-canary.wave5] — 2026-05-09

### Added
- **OpenAPI Polish** (Wave 5): `@banhmi/openapi` (renamed from `@banhmi/swagger`; deprecated shim kept for migration), Scalar UI as default renderer, full NestJS decorator parity, CLI plugin for auto `@ApiProperty` inference, SDL export helper.
- `@banhmi/swagger` kept as a deprecated re-export shim.

---

## [0.7.0-canary.wave4] — 2026-05-09

### Added
- **Data** (Wave 4): `@banhmi/postgres` (Bun.sql-backed), `@banhmi/mysql`, `@banhmi/drizzle` (Drizzle ORM with SQLite + Postgres drivers), `@banhmi/mongo` (official `mongodb` driver).
- Cluster apps: `examples/drizzle-api/` (Drizzle + PostgreSQL), `examples/cats-mongo/` (MongoDB CRUD).

---

## [0.6.0-canary.wave3] — 2026-05-09

### Added
- **Observability** (Wave 3): `@banhmi/logger` (structured JSON logger, pino-compatible), `@banhmi/events` (sync + async pub/sub `EventEmitter2`), `@banhmi/scheduling` (cron, intervals, timeouts), `@banhmi/queue` (BullMQ-style on `@banhmi/redis`), `@banhmi/sentry` (Sentry SDK bridge), `@banhmi/otel` (OpenTelemetry SDK bridge), `@banhmi/devtools` (DI graph explorer + request profiler).
- Cluster app `examples/scheduling-queues/`.

---

## [0.5.0-canary.wave2] — 2026-05-09

### Added
- **Security** (Wave 2): `@banhmi/crypto` (HMAC, AES, token generation — pure helpers), `@banhmi/security` (Helmet + CORS + CSRF in one package), `@banhmi/throttler` (rate limiter with Redis-backed distributed store), `@banhmi/auth` (Better Auth integration — sessions, JWT, OAuth, 2FA).
- Cluster app `examples/better-auth-api/`.

---

## [0.4.0-canary.wave1] — 2026-05-09

### Added
- **HTTP & Validation** (Wave 1): `@banhmi/static` (static-file serving), `@banhmi/compression` (Bun-native gzip/zstd/brotli), `@banhmi/sse` (Server-Sent Events), `@banhmi/cookies` (cookie parsing + signing), `@banhmi/versioning` (URI, header, media-type strategies), `@banhmi/middleware` (functional + class + module-level middleware), `@banhmi/validation` (Zod `ValidationPipe` + all `Parse*Pipe`s), `@banhmi/transform` (class-transformer serialisation decorators).

---

## [0.3.0-canary.wave0] — 2026-05-08

### Added
- **Foundation** (Wave 0): 86-page MDX doc-site pipeline (`@mdx-js/rollup`, TanStack Start, `doc-routes.json`), quality scripts (`no-anys`, `no-bangs`, `no-reflect`, `tsdoc`, `links`), benchmark harness (`oha.ts`, `runner.ts`), CI matrix (GitHub Actions, Bun matrix), examples template, agent prompt template.

---

## [0.2.0] — 2026-05-04

### Added
- Early feature packages: `@banhmi/config`, `@banhmi/jwt`, `@banhmi/redis`, `@banhmi/cache`, `@banhmi/s3`, `@banhmi/sqlite`, `@banhmi/swagger`, `@banhmi/websocket`, CLI scaffold.

---

## [0.1.0] — 2026-05-03

### Added
- Initial monorepo: `@banhmi/common`, `@banhmi/core`, `@banhmi/platform-bun`, `banhmi` re-export package, `examples/cats-api/`.
- TC39 Stage 3 decorators, `Symbol.metadata` polyfill, static `inject` DI, raw `Bun.serve` adapter, Radix-tree router.
- Biome 2.x configuration, Bun test runner, conventional-commits policy.
