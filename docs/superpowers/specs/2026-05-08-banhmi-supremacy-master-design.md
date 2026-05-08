# Banhmi Supremacy — Master Design Specification

**Date:** 2026-05-08
**Status:** Approved
**Scope:** Full NestJS feature parity + Bun-native superpowers + benchmark dominance over NestJS@Express and NestJS@Fastify
**Approach:** Hierarchical specs — this master doc sets vision, package list, wave order, quality gates, and orchestration rules. Each wave receives its own brainstorm → spec → plan → implementation cycle when it begins.

---

## 1. Problem Statement

Banhmi today is a Bun-first, NestJS-inspired framework with 14 packages shipped (common/core/platform-bun, sqlite, s3, redis, cache, jwt, config, swagger, testing, plus CLI and a TanStack Start docs app). The NestJS public documentation table-of-contents lists roughly 150 distinct features across nine sections (Overview, Fundamentals, Techniques, Security, GraphQL, WebSockets, Microservices, Standalone/CLI/OpenAPI/Recipes, FAQ, Devtools). Banhmi covers a subset of these; the rest are gaps.

The goal is to deliver every feature on that list, plus Bun-exclusive features that NestJS lacks, with:

- A working example per feature (used as the source of truth for documentation snippets and as a unit-test fixture).
- A documentation page per feature, mirroring NestJS structure plus Banhmi-unique sections.
- Benchmarks proving Banhmi outperforms NestJS@Express and NestJS@Fastify on representative scenarios.
- Production-grade quality bars (≥90% line coverage per package, zero `any` / `!` / `reflect-metadata`, Biome clean, TSDoc on public symbols, OWASP defaults, perf budgets per package).

Time is not a constraint. Quality is.

## 2. Goals

1. **NestJS parity** — every feature on the NestJS docs nav is implemented or explicitly documented as "intentionally omitted" with rationale.
2. **Bun-native advantage** — every Bun-exclusive primitive (`bun:sqlite`, `Bun.sql`, `Bun.S3Client`, `Bun.password`, `Bun.gzip`, native FormData, native WebSocket, native HTTP/2) is exposed first-class and documented.
3. **Examples-as-tests** — every feature has a micro-example under `examples/features/<slug>/` that doubles as a doc snippet and an integration test. Cluster apps under `examples/<topic>/` exercise multiple features in real-world shapes and feed the benchmark suite.
4. **Scalar-rendered OpenAPI** — `@banhmi/openapi` (renamed from swagger) ships Scalar UI by default, with Swagger UI available as an opt-in.
5. **Benchmark dominance** — published numbers beat NestJS@Express and NestJS@Fastify on hello-world RPS, JSON serialization, validation-heavy paths, file upload, WebSocket throughput, DB round-trip, cold start, and RSS.
6. **Migration path** — a "Migrating from NestJS" guide with side-by-side examples and codemods where feasible.

## 3. Non-Goals

- Compodoc-style auto-generated API browser (replaced by the docs site).
- Express/Fastify HTTP adapters (Bun-only by design).
- `reflect-metadata` / `experimentalDecorators` support.
- A standalone task-runner separate from `bun`.

## 4. Final Package List (47 packages — 13 existing, 34 new)

### 4.1 Existing (polish + complete)

| Package | Status | Wave that touches it |
|---|---|---|
| `@banhmi/common` | shipped | every wave (extends decorators / interfaces) |
| `@banhmi/core` | shipped | 0, 6 (CQRS), 8 (microservices), 9 (edge) |
| `@banhmi/platform-bun` | shipped | 0, 1, 5, 9 |
| `banhmi` (facade) | shipped | every wave (re-exports) |
| `@banhmi/cache` | shipped | 3 (events), 4 (db) |
| `@banhmi/config` | shipped | 1, 2, 3, 9 |
| `@banhmi/jwt` | shipped | 2 (auth) |
| `@banhmi/redis` | shipped | 3 (queues), 4 (db) |
| `@banhmi/s3` | shipped | 1 (multipart), 4 (db) |
| `@banhmi/sqlite` | shipped | 4 (db) |
| `@banhmi/testing` | shipped | every wave (test fixtures) |
| `@banhmi/swagger` → rename **`@banhmi/openapi`** | shipped, rename in Wave 5 | 5 (Scalar) |
| `@banhmi/cli` (in `apps/cli/`) | shipped | 0, every wave (generators) |

### 4.2 New packages (34)

| Package | Wave | Purpose |
|---|---|---|
| `@banhmi/middleware` | 1 | functional + class middleware, ordering, route scoping |
| `@banhmi/validation` | 1 | adapter-based (Zod / Valibot / ArkType / native), built-in validators |
| `@banhmi/transform` | 1 | serializer pipeline, class-transformer parity |
| `@banhmi/versioning` | 1 | URI / header / media versioning |
| `@banhmi/cookies` | 1 | parse/sign cookies, secure defaults |
| `@banhmi/session` | 1 | server-side session, memory + redis stores |
| `@banhmi/compression` | 1 | gzip / br / zstd via Bun |
| `@banhmi/multipart` | 1 | file upload, native FormData |
| `@banhmi/sse` | 1 | Server-Sent Events polish |
| `@banhmi/static` | 1 | static file server with `Bun.file` |
| `@banhmi/security` | 2 | helmet + CORS + CSRF, modular |
| `@banhmi/throttler` | 2 | rate limiting (token bucket) |
| `@banhmi/crypto` | 2 | Argon2id / scrypt / AES-GCM helpers |
| `@banhmi/auth` | 2 | Passport-equivalent strategies + better-auth bridge |
| `@banhmi/logger` | 3 | structured logging, Pino-grade perf |
| `@banhmi/events` | 3 | event emitter + decorators |
| `@banhmi/scheduling` | 3 | cron + intervals |
| `@banhmi/queue` | 3 | BullMQ-style on Bun + Redis |
| `@banhmi/sentry` | 3 | Sentry integration |
| `@banhmi/otel` | 3 | OpenTelemetry integration |
| `@banhmi/devtools` | 3 | DI graph + request profiler |
| `@banhmi/postgres` | 4 | `Bun.sql` Postgres native |
| `@banhmi/mysql` | 4 | `Bun.sql` MySQL native |
| `@banhmi/drizzle` | 4 | first-class Drizzle integration |
| `@banhmi/mongo` | 4 | thin native MongoDB driver wrapper |
| `@banhmi/mvc` | 6 | view engines (eta / edge) |
| `@banhmi/health` | 6 | Terminus parity |
| `@banhmi/mailer` | 6 | Nodemailer-equivalent |
| `@banhmi/i18n` | 6 | locale resolvers |
| `@banhmi/cqrs` | 6 | commands / queries / sagas |
| `@banhmi/graphql` | 7 | code-first + schema-first, federation, subs |
| `@banhmi/microservices` | 8 | Kafka / Redis / NATS / MQTT / RabbitMQ / gRPC / TCP + custom |
| `@banhmi/edge` | 9 | Cloudflare Workers / Vercel Edge / Deno Deploy |
| `@banhmi/serverless` | 9 | AWS Lambda wrapper |

### 4.3 Versioning policy

- Each package starts at `0.x` and tracks its own minor cadence via Changesets.
- The `banhmi` facade package version is the lowest public-package minor.
- 1.0.0-rc.1 is cut after Wave 10. 1.0.0 GA is cut after Wave 11 hits its targets.

## 5. Examples Strategy (single source of truth)

```
examples/
  features/<slug>/                 # one file per feature, ~150 entries
    index.ts                       # complete runnable demo (single file when possible)
    feature.test.ts                # integration test asserting behaviour
    README.md                      # 1-paragraph description (auto-imported into MDX)
  cats-api/                        # existing cluster app (HTTP fundamentals)
  better-auth-api/                 # existing cluster app (auth)
  drizzle-api/                     # existing cluster app (drizzle)
  graphql-demo/                    # new
  microservices-demo/              # new
  scheduling-queues/               # new
  mvc-app/                         # new
  edge-worker/                     # new
  lambda-app/                      # new
  sse-streams/                     # new
  devtools-demo/                   # new
  kitchen-sink/                    # new — exercises every package, used for benchmarks
```

Rules:

- A feature is **not done** until its micro-example is committed with a passing test.
- Doc MDX pages import code blocks from `examples/features/<slug>/index.ts` via a Vite/MDX transformer (added in Wave 0). This eliminates copy-paste rot.
- Cluster apps must run with a single `bun run dev` and pass `bun test` from their own directory.
- The `kitchen-sink` app is the benchmarking target and must build under 1.5 s on a clean cache.

## 6. Documentation Site IA

The docs site mirrors the NestJS section structure verbatim (so users browsing both feel at home), then adds Banhmi-unique sections at the top of each cluster:

```
Introduction
First Steps
Overview
  - Controllers
  - Providers
  - Modules
  - Middleware
  - Exception Filters
  - Pipes
  - Guards
  - Interceptors
  - Custom Decorators
Fundamentals
  - Custom providers / Async providers / Dynamic modules
  - Injection scopes / Circular deps / Module reference / Lazy loading
  - Execution context / Lifecycle events / Discovery service
  - Platform agnosticism (banhmi: "Bun-only by design")
  - Testing
Bun-native APIs           ← NEW
  - Bun.serve
  - bun:sqlite
  - Bun.sql (postgres / mysql)
  - Bun.S3Client
  - Bun.password
  - Bun.gzip / Bun.deflate / Bun.zstd
  - Native FormData
  - Native WebSocket
Built-ins                 ← NEW
  - Built-in pipes
  - Built-in validators
  - Built-in transformers
  - Built-in exceptions
  - Built-in interceptors
Techniques
  - Configuration
  - Database (sqlite / postgres / mysql / mongo / drizzle)
  - Validation
  - Caching
  - Serialization
  - Versioning
  - Task scheduling
  - Queues
  - Logging
  - Cookies
  - Events
  - Compression
  - File upload
  - Streaming files
  - HTTP module
  - Session
  - Model-View-Controller
  - Server-Sent Events
Security
  - Authentication
  - Authorization
  - Encryption and Hashing
  - Helmet
  - CORS
  - CSRF Protection
  - Rate limiting
GraphQL
  - (full NestJS list)
WebSockets
  - (full NestJS list)
Microservices
  - (full NestJS list)
Deployment
  - Standalone apps
  - HTTPS & multiple servers
  - Hybrid application
  - Edge / serverless
  - Hot reload
  - Raw body
  - Keep-Alive
  - Request lifecycle
  - Common errors
CLI
  - (full NestJS list)
OpenAPI
  - (full NestJS list, plus Scalar)
Recipes
  - (full NestJS list, plus better-auth, Drizzle, Sentry, OpenTelemetry, i18n)
Migration from NestJS     ← NEW
  - Concept-by-concept mapping
  - Codemods
  - Compatibility caveats
Performance & Benchmarks  ← NEW
  - Methodology
  - Live numbers vs NestJS@Express, NestJS@Fastify, Hono, Elysia
  - Tuning checklist
Production Checklist      ← NEW
Examples Catalog          ← NEW (auto-indexed from `examples/`)
Devtools
  - Overview
  - CI/CD integration
FAQ
  - (full NestJS list)
```

Implementation: every section is a route in the existing TanStack Start docs app. Wave 0 scaffolds every route shell with a `TODO` placeholder; subsequent waves replace placeholders.

## 7. Wave Plan

The plan is **Wave 0 (foundation) plus Waves 1–12 (feature waves)**, totaling 13 phases. Each feature wave produces:

- A wave-specific spec at `docs/superpowers/specs/<date>-wave-<n>-<topic>-design.md`.
- An implementation plan at `docs/superpowers/plans/<date>-wave-<n>-<topic>-plan.md`.
- One or more PRs (or direct commits, depending on user preference) that pass the wave verification gate.
- A canary release tagged `0.<3+n>.0-canary.<sha>`.

### Wave 0 — Foundation

**Output:** the scaffolding that the next 12 waves rely on.

- Master spec (this file) + wave-0 plan committed.
- All doc routes scaffolded with placeholder content (every IA item from section 6).
- `<CodeFromExample />` MDX component implemented and wired into the docs Vite/Bun build.
- `examples/features/.template/` reference template added (matches section 11.5).
- `docs/superpowers/templates/feature-agent-prompt.md` written (matches section 8.3).
- Quality scripts created: `scripts/quality/no-anys.ts`, `no-bangs.ts`, `no-reflect.ts`, `tsdoc-coverage.ts`.
- `benchmarks/` directory created with `runners/`, `scenarios/`, `competitors/` shells.
- Bench harness skeleton: spins up a Banhmi app, a NestJS@Express app, and a NestJS@Fastify app on random ports and runs `oha` against a JSON endpoint.
- CI matrix updated to run on Bun `latest` and `next`, plus a doc-build job and a benchmark-smoke job.
- Codex coordination harness: a small script in `scripts/codex/` that queues package scaffolds and bulk doc stubs.
- `docs/ROADMAP.md` updated to remove "not planned" stance on Microservices and GraphQL.

**Verification gate:** `bun test --recursive` green, `bun run lint` clean, doc build passes, bench harness runs (numbers are throwaway), quality scripts return zero new violations, no new `any`/`!`.

### Wave 1 — HTTP & Validation

**Packages:** middleware, validation, transform, versioning, cookies, session, compression, multipart, sse, static.

**Acceptance:** every NestJS "Techniques" feature in this cluster has a micro-example, a test, and a doc page; the cats-api cluster app picks up middleware + validation + versioning end-to-end; benchmark scenarios for validation-heavy paths and file upload added.

### Wave 2 — Security

**Packages:** security, throttler, crypto, auth.

**Acceptance:** OWASP top-10 baseline defaults; better-auth-api cluster app demonstrates auth flows; security-review skill run on the wave diff with no high-severity findings; `examples/features/csrf`, `helmet`, `cors`, `rate-limit`, `argon2id`, `aes-gcm`, `passport-jwt`, `passport-local`, `passport-google`.

### Wave 3 — Observability

**Packages:** logger, events, scheduling, queues, sentry, otel, devtools.

**Acceptance:** `scheduling-queues` cluster app demonstrates cron + queues + retries + DLQ; `devtools-demo` cluster app shows the DI graph + request profiler in a browser; OpenTelemetry traces flow to a local Jaeger via the demo `docker-compose.yml`.

### Wave 4 — Data

**Packages:** postgres, mysql, drizzle, mongo (plus polish on existing sqlite, redis).

**Acceptance:** drizzle-api cluster app upgraded to use both Postgres (via `Bun.sql`) and SQLite via toggle; cats-api ported to Mongo as alt cluster app; `examples/features/transactions`, `migrations`, `prepared-statements`, `connection-pool`, `pubsub`.

### Wave 5 — OpenAPI Polish

- Rename `@banhmi/swagger` → `@banhmi/openapi`. Keep a deprecated re-export shim for one minor cycle.
- Bundle Scalar UI as default; opt-in Swagger UI via `swagger-ui` flag.
- CLI plugin that infers `@ApiProperty`-equivalents from class shapes (parity with NestJS CLI plugin).
- SDL export for GraphQL (used in Wave 7).
- `examples/features/openapi-scalar`, `openapi-swagger-ui`, `openapi-cli-plugin`.

### Wave 6 — Patterns

**Packages:** mvc, health, mailer, i18n, cqrs.

**Acceptance:** `mvc-app` cluster app renders eta + edge templates; health endpoints expose db / disk / memory checks; CQRS sample handles a "create-order" flow with sagas; i18n demonstrates locale resolution by header / query / cookie.

### Wave 7 — GraphQL

**Package:** graphql.

**Acceptance:** `graphql-demo` cluster app exposes a code-first schema with subscriptions over WS, federation gateway with two subgraphs, complexity plugin, scalars, directives, interfaces, unions, mapped types, plugins, sharing-models pattern.

### Wave 8 — Microservices

**Package:** microservices.

**Acceptance:** `microservices-demo` cluster app spins up two services communicating over: TCP, Redis pub/sub, NATS, MQTT, RabbitMQ, Kafka, gRPC. Custom-transporter section shows how to add a new transport. Exception filters / pipes / guards / interceptors all work in the microservice context.

### Wave 9 — Edge & Serverless

**Packages:** edge, serverless.

**Acceptance:** `edge-worker` cluster app runs on Cloudflare Workers and Vercel Edge with the same source; `lambda-app` runs on AWS Lambda; HTTPS, hybrid, hot-reload, raw-body, keep-alive, request-lifecycle docs all complete with examples.

### Wave 10 — Migration & Quality

- Migrate-from-NestJS guide with side-by-side examples for every concept.
- Codemods (jscodeshift) for `@nestjs/common` → `@banhmi/common` import rewrites and `@Inject()` → `static inject` rewrites.
- Production checklist doc.
- Security audit pass (security-review skill across the whole repo, externalised to a written report).
- Perf budgets recorded per package in their READMEs (max RSS at idle, max startup time, p99 latency on a representative endpoint).

### Wave 11 — Benchmarks

- `benchmarks/competitors/` filled in: NestJS@Express, NestJS@Fastify, Hono, Elysia mirror apps.
- Scenarios run nightly in CI; results stored in `benchmarks/results/<date>/` and rendered into `apps/docs/performance/`.
- Targets:
  - Hello world ≥ 2× NestJS@Fastify RPS.
  - JSON-roundtrip ≥ 2× NestJS@Express, ≥ 1.3× NestJS@Fastify.
  - Validation-heavy ≥ 1.5× NestJS@Fastify.
  - Cold start ≤ 50 ms vs NestJS' 300–800 ms.
  - RSS at idle < 50% of NestJS@Express.
- Benchmark methodology page: hardware, kernel tunings, warmup, sample size, p50/p95/p99/p99.9, fairness rules.

### Wave 12 — Polish & Release

- Doc site full review pass; broken-link checker green.
- Each cluster example has a polished README with quickstart and architecture notes.
- Landing page on docs site rewritten with marquee numbers.
- 1.0.0-rc.1 cut, then 1.0.0 GA after a 7-day soak with no critical bugs.

## 8. Orchestration

### Wave kickoff

1. Spawn the `superpowers:brainstorming` skill scoped to the wave's topic.
2. Output a wave spec, then a wave plan via `superpowers:writing-plans`.
3. Dispatch parallel implementation agents per cluster (one agent per package, per `superpowers:dispatching-parallel-agents` rules).
4. After all agents complete, run wave verification gate.
5. Run `superpowers:requesting-code-review` and `security-review` on the cumulative wave diff.
6. Cut a canary release.

### Codex usage policy

Codex (or any cooperating agent) is dispatched for:

- Cookie-cutter package scaffolding (one prompt → 22 new package skeletons).
- Bulk MDX route stub creation.
- Mass renames (e.g., `@banhmi/swagger` → `@banhmi/openapi`).
- Repetitive cross-package wiring (e.g., adding the same `bunfig.toml` polyfill preload to every new package).

Claude agents (in-process or background) are dispatched for:

- Design-sensitive code (DI internals, decorator metadata, router fast paths).
- Test authoring (TDD discipline required).
- Code review and security review.
- Doc page authorship.

The spawning agent (master orchestrator) **never** writes implementation code itself except for cross-cutting infrastructure in Wave 0; it dispatches agents and verifies outputs.

### Per-feature agent prompt template

Stored at `docs/superpowers/templates/feature-agent-prompt.md`. Each spawned agent receives:

- Path to the wave spec.
- Path to the package skeleton.
- The exact NestJS doc URL for the equivalent feature.
- A pointer to `examples/features/.template/`.
- The verification commands to run before reporting completion.

### Verification gate (per wave)

```
bun test --recursive             # all packages, all tests green
bun run lint                     # biome clean
bun run docs:build               # docs build green
bun run benchmarks:smoke         # bench harness still runs (numbers throwaway)
bun run typecheck                # tsc --noEmit clean
scripts/quality/no-anys.ts       # zero new `any` / `!`
scripts/quality/no-reflect.ts    # zero `reflect-metadata` imports
```

A wave does not ship a canary release until the gate is green.

### Failure handling

- A failing test inside a wave blocks the wave gate. Dispatch a debugging agent (`superpowers:systematic-debugging`) before proceeding.
- A perf regression > 5% on any benchmarked scenario blocks Wave 11 GA, must be root-caused before proceeding.
- A security finding > medium blocks Wave 10 sign-off until remediated.

## 9. Quality Bars

| Bar | Threshold | Enforced by |
|---|---|---|
| Line coverage per package | ≥ 90% | `bun test --coverage`, fails CI below threshold |
| `any` usage | 0 new | `scripts/quality/no-anys.ts` (greps for `: any` and `<any>`) |
| `!` non-null assertions | 0 new | `scripts/quality/no-bangs.ts` |
| `reflect-metadata` | 0 imports | `scripts/quality/no-reflect.ts` |
| Biome | clean | `bun run lint` |
| TSDoc | every public symbol | `scripts/quality/tsdoc-coverage.ts` |
| Bundle size | per-package budget | size-limit config per package |
| Cold start (kitchen-sink) | ≤ 60 ms | bench scenario `cold-start` |
| RSS at idle (kitchen-sink) | < 75 MB | bench scenario `rss-idle` |

## 10. Benchmark Plan

```
benchmarks/
  runners/
    oha.ts                    # wraps `oha`
    bombardier.ts             # wraps `bombardier`
    autocannon.ts             # wraps `autocannon`
  scenarios/
    hello/                    # 200 OK "hello"
    json-roundtrip/           # echo JSON body of 1KB
    validation/               # 10-field DTO validated
    file-upload/              # 5MB multipart
    ws-throughput/            # 1000 concurrent ws clients
    db-cats/                  # CRUD against sqlite + postgres
    cold-start/               # spawn process, measure first 200 OK
    rss-idle/                 # spawn, idle 30s, measure RSS
  competitors/
    banhmi/                   # symlink to examples/kitchen-sink
    nestjs-express/
    nestjs-fastify/
    hono/
    elysia/
  results/<date>/             # JSON output, rendered into docs site
```

Methodology:

- Hardware pinned in CI (GitHub Actions `ubuntu-24.04`, 8 vCPU runners). Local runs are advisory.
- 30-second warmup, 60-second sample, 3 runs, median reported.
- p50 / p95 / p99 / p99.9 latencies, requests-per-second, RSS, CPU.
- Fairness rules: identical handler logic, identical validation libraries (Zod) where applicable, identical Node versions for NestJS.

## 11. Cross-Cutting Standards

### 11.1 Package layout

```
packages/<name>/
  src/
    index.ts            # public exports, no logic
    <feature>.ts        # implementation files
  test/
    <feature>.test.ts
  README.md             # quickstart + perf budget table
  package.json
  tsconfig.json
  bunfig.toml           # polyfill preload if decorators used
```

### 11.2 Public API export rules

- `index.ts` re-exports from named files only. No wildcard from internal directories.
- Any symbol that is intentionally public must have TSDoc with at least one `@example` block.
- Internal symbols live under `src/internal/` and are never re-exported from `index.ts`.

### 11.3 Testing patterns

- Unit tests live next to their target under `test/` mirroring `src/` structure.
- Integration tests live in `packages/platform-bun/test/integration.test.ts` (existing convention).
- Tests must not rely on hard-coded ports — use `port: 0` and read `server.port`.
- Tests must clean up resources via `afterAll` / `afterEach` even on assertion failures.

### 11.4 Doc page template

Each MDX page follows:

```mdx
# Feature Name

## When to use

## Setup

## Usage
<CodeFromExample slug="feature-slug" />

## API reference

## Common pitfalls

## See also
```

The `<CodeFromExample />` MDX component reads `examples/features/<slug>/index.ts` at build time.

### 11.5 Example template

```ts
// examples/features/<slug>/index.ts
// One-line description of what this example demonstrates.
import { Module, Controller, Get } from 'banhmi'
// ...minimal demo code...
export { AppModule }
```

```ts
// examples/features/<slug>/feature.test.ts
import { test, expect } from 'bun:test'
import { Test } from '@banhmi/testing'
import { AppModule } from './index'

test('<feature>: <expectation>', async () => {
  const app = await Test.createApplication(AppModule)
  // assert behaviour
  await app.close()
})
```

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Feature creep blowing schedule | Wave gates with hard "no new scope inside a running wave" rule; new ideas get queued for a later wave |
| Bun API drift | CI matrix runs against Bun `latest` and `next`; scheduled weekly run against `canary` |
| Microservices/GraphQL spec drift | Lift NestJS test fixtures, run them against our implementation |
| Decorator metadata regressions | Property-based tests on metadata writes (fast-check) |
| Perf claim regressions | Benchmark in CI, fail PR on > 5% regression on tracked scenarios |
| Doc rot | Doc snippets imported from `examples/features/*` — single source of truth |
| Security oversights | Wave 10 security audit + ongoing security-review skill on every wave diff |
| Worktree/repo state confusion across many parallel agents | Each agent runs in an isolated worktree, gates merge behind verification |

## 13. Open Decisions Resolved

- **Microservices and GraphQL**: included (override the previous "not planned" stance in `docs/ROADMAP.md`; that file is updated in Wave 0).
- **Mongo**: thin native wrapper, not Mongoose, in `@banhmi/mongo`.
- **Compodoc**: omitted; the docs site fills this role.
- **Examples model**: hybrid — micro-examples per feature (proof + doc snippet source) plus cluster apps (tutorials + benchmarks).

## 14. Next Step

Wave 0 implementation plan written via `superpowers:writing-plans` immediately after this spec is committed.
