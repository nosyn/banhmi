# Wave 6 — Patterns Summary

**Predecessor:** Wave 5 (OpenAPI Polish) — `v0.8.0-canary.wave5`
**Tag:** `v0.9.0-canary.wave6`

## Highlights

Five new packages shipping the "Patterns" tier:

### `@banhmi/mvc` — commit `c5e5624`
- `@Render(template)` method decorator wraps a route handler: calls the original, treats its return value as template locals, renders HTML.
- Module-scope engine registry (`registerEngine` / `getActiveEngine`) so the engine is available without per-request DI.
- `etaEngine(opts?)` factory for [Eta](https://eta.js.org/) (lightweight, zero-dependency).
- `edgeEngine(opts?)` factory for [edge.js](https://edgejs.dev/) (Adonis-style layouts/components).
- `MvcModule.forRoot(opts)` dynamic module bootstraps the engine via `OnApplicationBootstrap`.
- 6 tests (engine render, `@Render` decorator, null-engine guard, module wiring).

### `@banhmi/health` — commit `1f7a081`
- `HealthModule.forRoot({ indicators, path? })` mounts a GET `<path>` endpoint via `adapter.use()` (defaults to `/health`).
- Built-in indicators: `memoryIndicator`, `diskIndicator`, `dbIndicator`, `redisIndicator`, `customIndicator`.
- Returns `200 { status: 'ok', results: [...] }` or `503 { status: 'error', results: [...] }` based on indicator results.
- 9 tests (indicators unit, endpoint 200/503, no-handler passthrough).

### `@banhmi/mailer` — commit `d40cabe`
- `MailerService.send(message)` lazy-loads nodemailer at first call (peer dep).
- Template rendering: `eta` and `edge.js` template engines auto-detected by extension.
- `MailerModule.forRoot(opts)` dynamic module.
- 5 tests (send raw HTML, template rendering, transport options, defaults).

### `@banhmi/i18n` — commit `846f70f`
- `I18nService.t(key, args?, ctx?)` — nested key lookup with `{placeholder}` interpolation.
- Locale resolution chain: try each resolver in order, fall back to `fallbackLocale`.
- Resolvers: `HeaderResolver` (Accept-Language), `queryResolver({ param })` (default `?lang=`), `cookieResolver({ cookie })`.
- `I18nModule.forRoot(opts)` dynamic module.
- 19 tests (translation, interpolation, fallback, nested keys, all three resolvers).

### `@banhmi/cqrs` — commit `ecda1e8`
- `CommandBus.register(cls, handler)` / `CommandBus.execute(cmd)`.
- `QueryBus.register(cls, handler)` / `QueryBus.execute(qry)`.
- `EventBus.register(cls, handler)` / `EventBus.publish(evt)` / `EventBus.subscribe(cls)` — async iterable for sagas.
- TC39 Stage 3 decorators: `@CommandHandler(cmd)`, `@QueryHandler(qry)`, `@EventsHandler(...evts)`, `@Saga()`.
- `runSaga(fn, eventClass, commandBus, eventBus)` — fire-and-forget async generator loop.
- `CqrsExplorer implements OnApplicationBootstrap` — walks module tree to register all decorated handlers and start sagas.
- `CqrsModule` — registers all buses + explorer.
- 14 tests across 4 files (command/query/event buses + saga end-to-end).

## Tests

**1179 pass, 41 skip (Redis/infra), 0 fail** across 184 files.
Wave 5 baseline: 1126. Wave 6 added 53 new tests (+5%).

## Files changed

| Package | New files | Modified files |
|---------|-----------|----------------|
| `@banhmi/mvc` | 12 | 2 (banhmi index + package.json) |
| `@banhmi/health` | 10 | 2 |
| `@banhmi/mailer` | 9 | 3 (banhmi + 2 docs) |
| `@banhmi/i18n` | 11 | 3 (banhmi + 2 docs) |
| `@banhmi/cqrs` | 15 | 3 (banhmi + 1 doc) |

## Known follow-ups

- Pre-existing 6 `: any` violations in `packages/common/` (`ClassConstructor` type definition). No new violations introduced in Wave 6.
- `etaEngine` and `edgeEngine` lazy-import their respective packages at first render; errors surface as `Error: Cannot find module 'eta'` if the peer dep is not installed — document this clearly.
- `CqrsExplorer` saga wiring requires the saga class to also carry `@EventsHandler` to declare event subscriptions; a future wave may support a dedicated `@SagaHandler(EventClass)` decorator.
- `MailerService` transport is not pooled; a future wave may add connection pooling.

## Verification gate

| Command | Result |
|---------|--------|
| `bun run lint` | PASS (0 errors, 0 warnings) |
| `bun test --recursive` | PASS (1179 pass, 41 skip, 0 fail across 184 files) |
| `bun run docs:build` | PASS (built in ~6s) |
| `bun run benchmarks:smoke` | SKIP (oha not installed — expected) |
| `bun run quality:no-bangs` | PASS (0 violations in Wave 6 packages) |
| `bun run quality:no-reflect` | PASS (0 violations in Wave 6 packages) |
| `bun run quality:tsdoc` | PASS |
| `bun run quality:no-anys` | 6 pre-existing violations in `packages/common/` (no new ones) |
