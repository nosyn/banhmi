# Scheduling & Queues

A Banhmi cluster app demonstrating background jobs, cron scheduling, event
emission, and the live devtools dashboard — all wired together via DI. A
`HeartbeatService` ticks every 200ms, a `POST /email` endpoint enqueues jobs
processed by `EmailQueueProcessor`, and the whole DI graph is visible in
real time at `/__banhmi/devtools`.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- Redis 7+ running locally (`redis://localhost:6379`)

## Quickstart

```bash
# From the repo root
bun install

cd examples/scheduling-queues
bun run dev
```

App at `http://localhost:3000`.
Devtools at `http://localhost:3000/__banhmi/devtools`.

## Key concepts demonstrated

- `@Interval(ms)` cron-style scheduling via `@banhmi/scheduling`
- Queue job definition and processor via `@banhmi/queue`
- `@OnEvent` / `EventEmitter2` inter-service events via `@banhmi/events`
- Structured logging via `@banhmi/logger`
- Live DI graph explorer via `@banhmi/devtools`

## Related docs

- [Scheduling](/techniques/scheduling)
- [Queues](/techniques/queues)
- [Events](/techniques/events)
- [Logger](/techniques/logger)
