# Wave 6 — Patterns Implementation Plan

**Predecessor:** Wave 5 (OpenAPI Polish) `v0.8.0-canary.wave5`, 1126 tests.
**Goal:** Ship 5 patterns packages — mvc, health, mailer, i18n, cqrs.

**Cross-task conventions:** identical to Waves 1-5. Reference existing packages for shape (`packages/cookies/`, `packages/throttler/`, `packages/auth/`).

**Order of work:**

1. `@banhmi/mvc` — view engine support (eta + edge).
2. `@banhmi/health` — health checks (Terminus parity).
3. `@banhmi/mailer` — SMTP via Nodemailer-equivalent.
4. `@banhmi/i18n` — locale resolvers.
5. `@banhmi/cqrs` — commands, queries, events, sagas.
6. Wave verification gate.

---

## Task 1 — `@banhmi/mvc`

```
packages/mvc/
  package.json (peerDeps: eta, edge.js — optional)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/mvc.module.ts
  src/render.decorator.ts          # @Render('template')
  src/engines/eta.ts               # eta wrapper
  src/engines/edge.ts              # edge.js wrapper (optional)
  src/types.ts
  src/tokens.ts
  test/mvc.test.ts

examples/features/mvc/{...}
```

Public API:

```ts
export { MvcModule } from './mvc.module'
export { Render } from './render.decorator'
export { etaEngine, edgeEngine } from './engines'
export type { MvcOptions, ViewEngine } from './types'
```

`MvcModule.forRoot({ engine, viewsDir, layoutsDir? })`. `@Render('hello')` on a handler indicates the template to render with the handler's return value as locals.

Tests:
- Eta engine renders `{name}` template with `{ name: 'banh' }` → `'banh'`.
- `@Render` wraps the handler — the response content-type is `text/html` and the body is the rendered template.

Doc page: `apps/docs/apps/web/src/content/techniques/mvc.mdx`.

Commit: `feat(mvc): add @banhmi/mvc with eta + edge view engine adapters`

---

## Task 2 — `@banhmi/health`

```
packages/health/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/health.module.ts
  src/health.controller.ts         # mountable controller
  src/indicators/{disk,memory,db,redis,custom}.ts
  src/types.ts
  src/tokens.ts
  test/health.test.ts

examples/features/health/{...}
```

Public API:

```ts
export { HealthModule } from './health.module'
export { HealthController } from './health.controller'
export {
  diskIndicator,
  memoryIndicator,
  dbIndicator,
  redisIndicator,
  customIndicator,
} from './indicators'
export type { HealthIndicator, HealthCheckResult, HealthOptions } from './types'
```

```ts
type HealthIndicator = () => Promise<{ status: 'up' | 'down'; details?: Record<string, unknown> }>

type HealthOptions = {
  path?: string                          // default '/health'
  indicators?: Record<string, HealthIndicator>
}
```

`HealthModule.forRoot({ path, indicators })` mounts a `GET <path>` endpoint that runs all indicators and returns `{ status: 'up' | 'down' | 'degraded', details: { [name]: { status, ... } } }`.

Built-in indicators:
- `memoryIndicator({ heapUsedThresholdMb })` — checks `process.memoryUsage()`.
- `diskIndicator({ path, freeBytesThreshold })` — checks `fs.statfs`.
- `dbIndicator(sqlConn)` — runs `SELECT 1`.
- `redisIndicator(client)` — `PING`.
- `customIndicator(name, fn)` — wraps a user function.

Tests:
- Mounted endpoint returns 200 when all up; 503 when any down.
- Memory indicator status reflects threshold.
- Custom indicator runs the user function and propagates its result.

Doc page: `apps/docs/apps/web/src/content/recipes/health-checks.mdx`.

Commit: `feat(health): add @banhmi/health with disk/memory/db/redis/custom indicators`

---

## Task 3 — `@banhmi/mailer`

```
packages/mailer/
  package.json (peerDep: nodemailer)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/mailer.module.ts
  src/mailer.service.ts
  src/template/render.ts             # use @banhmi/mvc engines for templates
  src/types.ts
  src/tokens.ts
  test/mailer.test.ts

examples/features/mailer/{...}
```

Public API:

```ts
export { MailerModule } from './mailer.module'
export { MailerService } from './mailer.service'
export type { MailerOptions, MailMessage, SmtpTransport } from './types'
```

```ts
type MailerOptions = {
  transport: SmtpTransport          // host/port/auth or pre-built nodemailer transport
  defaults?: { from?: string }
  templateDir?: string
  templateEngine?: 'eta' | 'edge'
}

type MailMessage = {
  to: string | string[]
  from?: string
  subject: string
  text?: string
  html?: string
  template?: string                 // template name when templateDir is set
  context?: Record<string, unknown>
}
```

`MailerService.send(message: MailMessage): Promise<void>`. Lazy-loads `nodemailer` via peer dep; if unavailable, throws on first send with a clear error.

Tests:
- Mocked nodemailer transport: send call invokes transport.sendMail with right options.
- Template rendering: `template: 'welcome'` with `context: {...}` reads `welcome.eta`, renders, sets html.

Doc page: not in current IA — add `mailer` slug under `recipes` in `doc-routes.json`, regenerate routes, fill in MDX.

Commit: `feat(mailer): add @banhmi/mailer with nodemailer transport + template rendering`

---

## Task 4 — `@banhmi/i18n`

```
packages/i18n/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/i18n.module.ts
  src/i18n.service.ts
  src/resolvers/{header,query,cookie}.ts
  src/types.ts
  src/tokens.ts
  test/i18n.test.ts

examples/features/i18n/{...}
```

Public API:

```ts
export { I18nModule } from './i18n.module'
export { I18nService } from './i18n.service'
export { HeaderResolver, QueryResolver, CookieResolver } from './resolvers'
export type { I18nOptions, LocaleResolver, Translations } from './types'
```

```ts
type I18nOptions = {
  fallbackLocale: string
  resolvers: LocaleResolver[]                  // tried in order
  loaderPath?: string                          // dir with <locale>.json files
  translations?: Record<string, Translations>  // inline
}

type Translations = Record<string, string | Translations>
```

`I18nService.t(key: string, args?: Record<string, unknown>, locale?: string): string` — translate, with `{var}` interpolation.

`HeaderResolver` reads `Accept-Language`. `QueryResolver` reads `?lang=...`. `CookieResolver` reads a configured cookie.

Tests:
- `t('greeting', { name: 'world' })` returns `'Hello, world!'`.
- Locale resolution: header → query → cookie → fallback.
- Missing key returns the key itself (logged warning).

Doc page: not in current IA — add `i18n` slug under `recipes`. Regenerate routes.

Commit: `feat(i18n): add @banhmi/i18n with header/query/cookie locale resolvers`

---

## Task 5 — `@banhmi/cqrs`

```
packages/cqrs/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/command-bus.ts
  src/query-bus.ts
  src/event-bus.ts
  src/saga.ts
  src/decorators.ts                # @CommandHandler, @QueryHandler, @EventsHandler, @Saga
  src/explorer.ts
  src/cqrs.module.ts
  src/types.ts
  src/tokens.ts
  test/{command-bus,query-bus,event-bus,saga}.test.ts

examples/features/cqrs/{...}
```

Public API:

```ts
export { CqrsModule } from './cqrs.module'
export { CommandBus, QueryBus, EventBus } from './command-bus'   // grouped re-exports
export { CommandHandler, QueryHandler, EventsHandler, Saga } from './decorators'
export type { ICommand, IQuery, IEvent, ICommandHandler, IQueryHandler } from './types'
```

`CommandBus.execute<TCommand, TResult>(command: TCommand): Promise<TResult>` — dispatches to the registered `@CommandHandler(CommandClass)` handler.

Same shape for `QueryBus` and `EventBus`. Sagas are async generators on the event bus.

Tests:
- `@CommandHandler(CreateUserCommand)` class with `execute(cmd)` is registered + invoked.
- `@QueryHandler(...)` returns the right result.
- `@EventsHandler(UserCreatedEvent)` runs on emit.
- `@Saga()` produces commands from incoming events.

Doc page: `apps/docs/apps/web/src/content/recipes/cqrs.mdx` (already in IA).

Commit: `feat(cqrs): add @banhmi/cqrs with command/query/event buses + sagas`

---

## Task 6 — Wave 6 verification gate + canary

Standard. Tag `v0.9.0-canary.wave6`. Summary at `docs/superpowers/specs/2026-05-09-wave-6-summary.md`.
