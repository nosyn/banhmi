# scheduling-queues

Cluster example demonstrating `@banhmi/logger`, `@banhmi/events`, `@banhmi/scheduling`, `@banhmi/queue`, and `@banhmi/devtools` working together. A `HeartbeatService` fires every 200ms via `@Interval`, an `EmailController` accepts `POST /email` jobs that are picked up by `EmailQueueProcessor` (which emits an `email.sent` event on completion), and the DI graph is inspectable live at `/__banhmi/devtools/graph.json`.

## Quickstart

```bash
# Requires a local Redis (default: redis://localhost:6379)
bun run dev
# App: http://localhost:3000
# Devtools: http://localhost:3000/__banhmi/devtools
```
