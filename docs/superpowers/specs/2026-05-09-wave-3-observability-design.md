# Wave 3 — Observability Design Specification

**Date:** 2026-05-09
**Status:** Approved (per master spec)
**Predecessor:** Wave 2 (`v0.5.0-canary.wave2`, 848 tests)
**Successor:** Wave 4 (Data)

## 1. Scope

Ship 7 packages closing the observability/runtime-services gap vs NestJS.

| # | Package | NestJS parallel |
|---|---|---|
| 1 | `@banhmi/logger` | `Logger` from `@nestjs/common`; production logging via Pino |
| 2 | `@banhmi/events` | `@nestjs/event-emitter` |
| 3 | `@banhmi/scheduling` | `@nestjs/schedule` |
| 4 | `@banhmi/queue` | `@nestjs/bullmq` (BullMQ-style on Redis) |
| 5 | `@banhmi/sentry` | recipe / Sentry SDK integration |
| 6 | `@banhmi/otel` | recipe / OpenTelemetry SDK integration |
| 7 | `@banhmi/devtools` | `@nestjs/devtools-integration` (DI graph + request profiler) |

## 2. Cross-cutting design decisions

### 2.1 Logger

`LoggerModule.forRoot({ level, prettyPrint?, transports? })`. Default transport writes line-delimited JSON to stdout. Each log line: `{ time, level, msg, ...context }`. `Logger.child({ requestId })` for request scoping. `BanhmiLogger` interface lets users plug a Pino instance via `transports: [{ pino: pinoInstance }]` if they want Pino's perf. Without external deps the built-in async writer batches to stdout via `process.stdout.write`.

### 2.2 Events

`EventEmitterModule.forRoot()` registers a global `EventEmitter2`-style emitter (or thin in-house implementation). `@OnEvent('user.created')` decorator marks methods to receive events. Wildcard support (`user.*`). Sync + async emit.

### 2.3 Scheduling

`ScheduleModule.forRoot()` registers a scheduler. `@Cron('0 0 * * *')` for cron expressions, `@Interval(60_000)` for repeated intervals, `@Timeout(5_000)` for one-shot. Stops cleanly on `OnApplicationShutdown`. Cron parser is small and pure (no `cron-parser` external dep — we write a minimal one for standard 5-field expressions).

### 2.4 Queues

`@banhmi/queue` is a BullMQ-style API on Bun + Redis. `QueueModule.forRoot({ redis })`. `@Processor('emails')` class with `@Process('send')` method handlers. Producer side: `Queue<JobData>('emails').add('send', { ... }, { delay, attempts })`. Stores jobs as Redis hashes; uses LPUSH/RPOPLPUSH for reliable processing. Built on `@banhmi/redis`.

### 2.5 Sentry

`SentryModule.forRoot({ dsn, tracesSampleRate, environment })`. Hooks into the global filter and an interceptor to capture exceptions and HTTP-request spans. Depends on the `@sentry/node` SDK as a peer dep.

### 2.6 OpenTelemetry

`OtelModule.forRoot({ serviceName, exporters })`. Initializes the OTel SDK; instruments HTTP requests, database queries (when `@banhmi/postgres`/`mysql`/`sqlite` are present), and outgoing fetch calls. Peer deps: `@opentelemetry/sdk-node`, `@opentelemetry/api`.

### 2.7 Devtools

`@banhmi/devtools` exposes a `/__banhmi/devtools` HTTP endpoint mounted via the `OnApplicationBootstrap` + `HTTP_ADAPTER_TOKEN` pattern. Pages:
- `/__banhmi/devtools/graph` — JSON dump of the DI graph (modules → providers → dependencies). React UI rendered server-side as a static HTML using a small inline graph viewer.
- `/__banhmi/devtools/profile` — per-request profiler: timeline of pipeline stages (middleware, guards, interceptors, pipes, handler, filters) for the last N requests.

Devtools should NOT be enabled in production by default. `DevtoolsModule.forRoot({ enabled: env.NODE_ENV !== 'production' })`.

## 3. Acceptance criteria (per package)

Same as Wave 1 + 2: ≥ 90% coverage, TSDoc on every public symbol with `@example`, micro-example with passing test, doc page MDX replaces placeholder, package re-exported from `packages/banhmi`. `quality:no-bangs`/`no-reflect`/`tsdoc` clean. Zero new `: any` violations.

## 4. Cluster-app integration

Build a new cluster app `examples/scheduling-queues/` demonstrating:
- `@banhmi/scheduling` — a cron job that runs every minute and logs.
- `@banhmi/queue` — an `email-queue` with a `@Processor('emails')` and a producer endpoint.
- `@banhmi/logger` — structured logging across the app.
- `@banhmi/events` — emit + listen for `email.sent` / `email.failed`.
- `@banhmi/devtools` — devtools mounted at `/__banhmi/devtools`.

(Sentry + OTel are environmental — demonstrated via README + an `examples/features/sentry/` and `examples/features/otel/` micro-example, not as integrations in the cluster app.)

## 5. Verification gate

Same shape. Tag canary `v0.6.0-canary.wave3`.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Logger performance vs Pino | Provide pluggable transports; document Pino as the recommended prod transport; built-in is for dev/zero-dep |
| Cron parser bugs | Write a tiny parser for standard 5-field cron only; defer extended syntax (seconds field, predefined `@daily`, etc.) to a follow-up |
| BullMQ-style queue is non-trivial on raw Redis | Start with the minimum: enqueue/dequeue/retry/delay; advanced features (rate limits, priorities, repeatable jobs) deferred to Wave 6 patterns |
| Devtools UI bloat | Server-rendered static HTML, no SPA; minimal CSS; tiny |
| OTel instrumentation can be flaky on Bun | Pin OTel SDK version; document known incompatibilities |

## 7. Out of scope

- Loki / Datadog / Grafana log shipping (recipes, not framework features).
- Distributed tracing across services (Wave 8 microservices).
- Profiling sampling (Wave 11 benchmarks).
