# Wave 3 — Observability Implementation Plan

> Use superpowers:subagent-driven-development. Each Task is one implementer dispatch unless otherwise noted.

**Goal:** Ship 7 observability/runtime-services packages.

**Architecture:** All packages follow the established Wave 1/2 patterns: `OnApplicationBootstrap` + `HTTP_ADAPTER_TOKEN` for adapter hooks; method-decorator-wraps-handler for route-scoped behavior; `Symbol.metadata` for declarative metadata; `static inject = [...] as const` for DI.

**Tech Stack:** Bun, TypeScript ESNext, TC39 Stage 3 decorators. Peer deps allowed where they're industry standard: `@sentry/node` (Sentry), `@opentelemetry/sdk-node` + `@opentelemetry/api` (OTel). All others use Bun-native APIs.

**Order of work:**

1. `@banhmi/logger` — used by every other Wave 3 package.
2. `@banhmi/events` — sync + async pub/sub.
3. `@banhmi/scheduling` — cron + intervals + timeouts.
4. `@banhmi/queue` — BullMQ-style on `@banhmi/redis`.
5. `@banhmi/sentry` + `@banhmi/otel` (batched — both are SDK-bridge packages, similar shape).
6. `@banhmi/devtools` — DI graph + request profiler.
7. Cluster app `examples/scheduling-queues/`.
8. Wave verification gate + canary.

---

## Task 1 — `@banhmi/logger`

Files:

```
packages/logger/
  package.json (deps: banhmi)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/logger.ts
  src/logger.module.ts
  src/transports/json.ts
  src/transports/pretty.ts
  src/inject-logger.ts        # InjectLogger() helper
  src/tokens.ts
  test/logger.test.ts
  test/transports.test.ts

examples/features/logger/{...}
```

Public API:

```ts
export { LoggerModule } from './logger.module'
export { Logger } from './logger'
export { jsonTransport, prettyTransport } from './transports'
export { InjectLogger } from './inject-logger'
export type { LoggerOptions, LogLevel, LogTransport, LogRecord } from './types'
export { LOGGER_OPTIONS, ROOT_LOGGER } from './tokens'
```

```ts
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
export type LogRecord = { time: number; level: LogLevel; msg: string; [k: string]: unknown }
export interface LogTransport { write(record: LogRecord): void | Promise<void> }

export type LoggerOptions = {
  level?: LogLevel                                    // default 'info'
  transports?: LogTransport[]                          // default [jsonTransport()]
  base?: Record<string, unknown>                       // attached to every record (e.g., serviceName)
}

export class Logger {
  child(context: Record<string, unknown>): Logger
  fatal(msg: string, ctx?: Record<string, unknown>): void
  error(msg: string, ctx?: Record<string, unknown>): void
  warn(msg: string, ctx?: Record<string, unknown>): void
  info(msg: string, ctx?: Record<string, unknown>): void
  debug(msg: string, ctx?: Record<string, unknown>): void
  trace(msg: string, ctx?: Record<string, unknown>): void
}
```

`jsonTransport()` writes line-delimited JSON to stdout via `Bun.write(Bun.stdout, ...)` or `process.stdout.write`.
`prettyTransport()` writes ANSI-colored human-readable lines.

`@InjectLogger(name?)` is a token-injection helper for `static inject = [...]` to get a child logger named after the consumer.

Tests (8+):
- Level filtering (debug doesn't log when level=info).
- `child` adds context to subsequent records.
- `base` is included on every record.
- Multiple transports each receive the record.
- JSON transport writes valid JSON ending with `\n`.
- Pretty transport produces a deterministic format that includes level + msg.
- `@InjectLogger('CatsService')` returns a child logger.

Micro-example: app where one provider logs `info('hello', { service: 'demo' })` on bootstrap.

Doc page: `apps/docs/apps/web/src/content/techniques/logging.mdx`.

Re-export.

Commit: `feat(logger): add @banhmi/logger with JSON/pretty transports`

---

## Task 2 — `@banhmi/events`

Files:

```
packages/events/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/event-emitter.ts
  src/event-emitter.module.ts
  src/decorators.ts            # @OnEvent
  src/explorer.ts              # walk modules at bootstrap, register handlers
  src/tokens.ts
  src/metadata.ts
  test/emitter.test.ts
  test/explorer.test.ts

examples/features/events/{...}
```

Public API:

```ts
export { EventEmitterModule } from './event-emitter.module'
export { OnEvent } from './decorators'
export { EventEmitter } from './event-emitter'   // class users can inject
export type { OnEventOptions, EventListener } from './types'
```

`EventEmitter` API:

```ts
class EventEmitter {
  emit(event: string, payload: unknown): void                 // sync
  emitAsync(event: string, payload: unknown): Promise<void[]>  // awaits all listeners
  on(pattern: string, listener: EventListener): () => void    // returns unsubscribe
  off(pattern: string, listener: EventListener): void
}
```

Wildcard: `'user.*'` matches `'user.created'`, `'user.deleted'`. Use a Trie or simple split-and-match.

`@OnEvent('user.created')` on a method registers it as a listener at `OnApplicationBootstrap` (explorer walks modules + controllers + providers).

Tests (8+):
- emit calls listener with payload.
- on returns unsubscribe.
- wildcard `user.*` matches `user.created`.
- emitAsync awaits async listeners.
- `@OnEvent` registered method is called when event emits.
- Listener errors don't break other listeners (sync).
- Listener errors aggregate in emitAsync result.
- Same event name with multiple listeners: all fire in registration order.

Micro-example: emit `user.created` from one provider; `@OnEvent('user.*')` in another logs receipt.

Doc page: `apps/docs/apps/web/src/content/techniques/events.mdx`.

Commit: `feat(events): add @banhmi/events with EventEmitter and @OnEvent`

---

## Task 3 — `@banhmi/scheduling`

Files:

```
packages/scheduling/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/scheduler.ts
  src/scheduler.module.ts
  src/decorators.ts            # @Cron, @Interval, @Timeout
  src/cron-parser.ts           # standard 5-field cron parser
  src/explorer.ts
  src/tokens.ts
  src/metadata.ts
  test/cron-parser.test.ts
  test/scheduler.test.ts

examples/features/scheduling/{...}
```

Public API:

```ts
export { ScheduleModule } from './scheduler.module'
export { Cron, Interval, Timeout } from './decorators'
export { Scheduler } from './scheduler'         // class users can inject for dynamic scheduling
export { parseCron, nextCronTime } from './cron-parser'
export type { CronOptions, ScheduleHandle } from './types'
```

Scheduler exposes:

```ts
class Scheduler {
  /**
   * Schedule a recurring job from a cron expression.
   * @example scheduler.cron('0 0 * * *', () => log('midnight'))
   */
  cron(expression: string, handler: () => void | Promise<void>, opts?: CronOptions): ScheduleHandle
  interval(ms: number, handler: () => void | Promise<void>): ScheduleHandle
  timeout(ms: number, handler: () => void | Promise<void>): ScheduleHandle
  cancelAll(): void
}
```

`ScheduleHandle` has a `.cancel()` method.

`parseCron(expr: string)` returns a structured representation; `nextCronTime(parsed, after: Date)` returns the next firing.

Standard 5-field cron: minute hour day-of-month month day-of-week. Support `*`, ranges (`1-5`), lists (`1,3,5`), steps (`*/2`). No predefined names (`@daily` etc.) for v1; document as a follow-up.

Tests:
- `parseCron('* * * * *')` valid.
- `parseCron('0 0 * * *')` next time is midnight.
- `parseCron` rejects invalid expressions.
- `nextCronTime` advances correctly across day/month boundaries.
- `@Cron('* * * * *')` fires at the right time (use a fake timer or short interval).
- `@Interval(50)` fires repeatedly.
- `@Timeout(50)` fires once.
- `OnApplicationShutdown` cancels all jobs.

Micro-example: `@Cron('*/10 * * * *')` logs every 10 minutes (test uses `@Interval(100)` for fast feedback).

Doc page: `apps/docs/apps/web/src/content/techniques/task-scheduling.mdx`.

Commit: `feat(scheduling): add @banhmi/scheduling with cron/interval/timeout decorators`

---

## Task 4 — `@banhmi/queue`

Files:

```
packages/queue/
  package.json (deps: @banhmi/redis)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/queue.ts                 # producer
  src/worker.ts                # consumer
  src/processor.decorator.ts   # @Processor(name)
  src/process.decorator.ts     # @Process(jobName)
  src/queue.module.ts
  src/explorer.ts
  src/types.ts
  src/tokens.ts
  test/queue.test.ts
  test/worker.test.ts

examples/features/queue/{...}
```

Public API:

```ts
export { QueueModule } from './queue.module'
export { Queue } from './queue'
export { Worker } from './worker'
export { Processor } from './processor.decorator'
export { Process } from './process.decorator'
export type { JobOptions, Job, ProcessorContext } from './types'
export { QUEUE_OPTIONS } from './tokens'
```

`Queue<TData>` produces:

```ts
class Queue<TData = unknown> {
  add(jobName: string, data: TData, opts?: JobOptions): Promise<Job<TData>>
}

type JobOptions = {
  delay?: number          // ms before processing
  attempts?: number       // retry count, default 1
  backoff?: { type: 'exponential' | 'fixed'; delay: number }
}
```

`Worker` consumes (registered automatically by `@Processor` + `@Process` decorators via the explorer at bootstrap).

`@Processor('emails')` on a class. `@Process('send')` on a method receives `Job<TData>`. The method returns a value (success) or throws (failure → retry per `attempts`).

Storage layout in Redis:
- `<queueName>:waiting` — list of job IDs ready to run.
- `<queueName>:delayed` — sorted set, score = run-at timestamp.
- `<queueName>:active` — list of currently-processing IDs.
- `<queueName>:job:<id>` — hash with data + metadata.

Worker loop: `BLPOP waiting`, parse job, run handler with timeout, on success delete; on failure with attempts left re-enqueue with backoff.

For Wave 3, ship the minimum: enqueue, dequeue, retry, delay. No priorities, no repeatable jobs, no rate limits — those are Wave 6 patterns work.

Tests: use a real local Redis (skip with `Bun.env.REDIS_URL` not set). Cover:
- enqueue + immediate process.
- delayed job processed after delay.
- failure retries up to `attempts`.
- exponential backoff increases between retries.
- multiple processors on multiple queues isolated.

Micro-example: an `email-queue` with a `Processor` that simulates sending. The test enqueues a job and asserts the processor's side-effect was observed.

Doc page: `apps/docs/apps/web/src/content/techniques/queues.mdx`.

Commit: `feat(queue): add @banhmi/queue with BullMQ-style Redis queues`

---

## Task 5 — `@banhmi/sentry` and `@banhmi/otel` (batch)

Two SDK-bridge packages. Each has a similar shape:
- `XxxModule.forRoot(opts)` initializes the SDK.
- A global filter / interceptor captures exceptions / spans.
- TSDoc points users at the underlying SDK's docs for advanced features.

### `@banhmi/sentry`

```
packages/sentry/
  package.json (peerDep: @sentry/node ^7 || ^8)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/sentry.module.ts
  src/sentry.filter.ts          # global exception filter
  src/sentry.interceptor.ts     # request tracing
  src/types.ts
  src/tokens.ts
  test/sentry.test.ts

examples/features/sentry/{...}
```

API:

```ts
export { SentryModule } from './sentry.module'
export { SentryExceptionFilter } from './sentry.filter'
export { SentryInterceptor } from './sentry.interceptor'
export type { SentryOptions } from './types'
```

```ts
type SentryOptions = {
  dsn: string
  environment?: string
  tracesSampleRate?: number      // default 0
  release?: string
}
```

The module calls `Sentry.init({...})` at bootstrap. Filter calls `Sentry.captureException(err)`. Interceptor wraps handler in `Sentry.startSpan({...})` if tracing enabled.

Tests: mock `@sentry/node` with `mock.module(...)` (Bun's mock API). Assert `init` called with the right opts; `captureException` called on filter trigger; `startSpan` called when tracing enabled.

### `@banhmi/otel`

```
packages/otel/
  package.json (peerDeps: @opentelemetry/sdk-node, @opentelemetry/api)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/otel.module.ts
  src/otel.interceptor.ts
  src/types.ts
  src/tokens.ts
  test/otel.test.ts

examples/features/otel/{...}
```

API:

```ts
export { OtelModule } from './otel.module'
export { OtelInterceptor } from './otel.interceptor'
export type { OtelOptions } from './types'
```

```ts
type OtelOptions = {
  serviceName: string
  exporters?: Array<'otlp' | 'console'>
  resource?: Record<string, unknown>
}
```

The module initializes `NodeSDK` at bootstrap with the chosen exporters. Interceptor wraps handler in a span carrying `http.method`, `http.target`, `http.status_code`.

Tests: mock OTel SDK. Assert `start()` called, span lifecycle correct, status set on error.

### Verify and commit (one commit per package)

```bash
git commit -m "feat(sentry): add @banhmi/sentry filter + interceptor bridge"
git commit -m "feat(otel): add @banhmi/otel interceptor + SDK bootstrap"
```

---

## Task 6 — `@banhmi/devtools`

```
packages/devtools/
  package.json (deps: banhmi, @banhmi/core, @banhmi/platform-bun)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/devtools.module.ts
  src/devtools.middleware.ts
  src/graph/dump.ts
  src/profile/recorder.ts
  src/ui/index.html.ts          # tiny inline HTML page
  src/types.ts
  src/tokens.ts
  test/graph-dump.test.ts
  test/profile-recorder.test.ts

examples/features/devtools/{...}
```

API:

```ts
export { DevtoolsModule } from './devtools.module'
export type { DevtoolsOptions } from './types'
```

```ts
type DevtoolsOptions = {
  enabled?: boolean              // default !env('NODE_ENV','production')
  path?: string                  // default '/__banhmi/devtools'
}
```

Endpoints (mounted via the adapter middleware):
- `GET <path>/graph.json` — JSON dump of `{ modules: [{ name, providers: [...], imports: [...] }], providers: [{ name, deps: [...] }] }` from the DI container.
- `GET <path>/graph` — static HTML rendering the JSON via a tiny SVG layout (force-directed simple).
- `GET <path>/profile.json` — last N pipeline records: `{ traceId, route, stages: [{ name, durationMs }], total, timestamp }`.
- `GET <path>/profile` — HTML table of the last N records.

Profile recorder hooks the enhancer pipeline (or wraps handlers at register time) to record stage timings. Use `performance.now()`.

Tests:
- Graph dump returns the expected shape from a small test module graph.
- Profile recorder records stages in order with timings > 0.
- Disabled module mounts nothing.
- HTML pages return 200 with the right content-type.

Micro-example: a simple app + a script that makes a few requests, then prints the devtools URL.

Doc pages: `apps/docs/apps/web/src/content/devtools/{overview,ci-cd-integration}.mdx`.

Commit: `feat(devtools): add @banhmi/devtools with DI graph + request profiler`

---

## Task 7 — Cluster app `examples/scheduling-queues/`

New cluster app:

```
examples/scheduling-queues/
  package.json
  bunfig.toml
  src/main.ts
  src/email/email.module.ts
  src/email/email-queue.processor.ts        # @Processor('emails') @Process('send')
  src/email/email.service.ts
  src/email/email.controller.ts             # POST /email/send enqueues; GET /sent lists
  src/cron/heartbeat.service.ts             # @Cron('*/1 * * * *') logs
  src/app.module.ts
  test/integration.test.ts
  README.md
```

Demonstrates: logger, events, scheduling, queue, devtools.

Tests:
- POST /email/send enqueues a job; processor picks it up; events emitted.
- Cron heartbeat logs (capture stdout).
- Devtools graph endpoint returns the DI graph.

Commit: `feat(scheduling-queues): add cluster app demonstrating wave-3 packages`

---

## Task 8 — Wave 3 verification gate + canary

Same gate. Tag `v0.6.0-canary.wave3`. Summary doc at `docs/superpowers/specs/2026-05-09-wave-3-summary.md`. End-of-wave commit: `docs(wave-3): add summary`.

---

## Self-Review

| Master spec wave-3 deliverable | Task in this plan |
|---|---|
| logger | Task 1 |
| events | Task 2 |
| scheduling | Task 3 |
| queues | Task 4 |
| sentry | Task 5 (batched with otel) |
| otel | Task 5 |
| devtools | Task 6 |
| cluster integration | Task 7 |
| verification gate | Task 8 |
