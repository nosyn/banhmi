# Wave 3 — Observability Summary

**Predecessor:** Wave 2 (Security) — `v0.5.0-canary.wave2`
**Tag:** `v0.6.0-canary.wave3`

## Packages shipped (7)

- `@banhmi/logger` — structured logging with JSON + pretty transports, `@InjectLogger(name)` for child loggers.
- `@banhmi/events` — `EventEmitter` + `@OnEvent` with wildcard pattern matching.
- `@banhmi/scheduling` — `@Cron`, `@Interval`, `@Timeout` decorators backed by an in-house 5-field cron parser.
- `@banhmi/queue` — BullMQ-style API (`@Processor`, `@Process`) on `@banhmi/redis` with delayed jobs and retry/backoff.
- `@banhmi/sentry` — peer-dep Sentry SDK bridge with `SentryExceptionFilter` and `SentryInterceptor`.
- `@banhmi/otel` — peer-dep OpenTelemetry SDK bridge with `OtelInterceptor`.
- `@banhmi/devtools` — `/__banhmi/devtools` endpoints exposing DI graph and request profile.

## Cluster app

`examples/scheduling-queues/` demonstrates logger, events, scheduling, queue, devtools end-to-end.

## Tests

994 pass, 0 fail (baseline was 989; +5 new tests in the cluster app).

## Known follow-ups

- Pre-existing 6 `: any` violations in `packages/common/`.
- Per-stage profile recorder is whole-request only; per-stage instrumentation requires deeper `runEnhancerPipeline` hooks (Wave 6 patterns).
- Queue worker uses 100ms polling instead of BRPOP (ioredis blocking quirks under Bun).
- Cron parser uses intersection semantics for DOM+DOW (documented).

## Verification gate

All eight gate commands exited 0 (or `quality:no-anys` reported only pre-existing).
