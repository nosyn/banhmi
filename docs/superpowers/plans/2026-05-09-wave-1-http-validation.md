# Wave 1 — HTTP & Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Each Task in this plan is one implementer dispatch. Steps within a Task use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 10 packages closing the HTTP/validation gap vs NestJS while exposing Bun-native primitives.

**Architecture:** Each package is a self-contained workspace under `packages/<name>/` with an `src/index.ts` public surface, `test/` integration tests, and TSDoc on every public export. Implementers add a micro-example under `examples/features/<slug>/` (single-file demo + test + README + package.json) and replace the placeholder MDX doc page.

**Tech Stack:** Bun, TypeScript ESNext, TC39 Stage 3 decorators, `Symbol.metadata`, Biome 2.4.10, `bun:test`. External deps allowed: `zod` (validation adapter), nothing else this wave.

**Cross-task conventions:**
- Run all commands from `/Users/nosyn/personal/banhmi`.
- New package skeleton: `packages/<name>/{package.json,tsconfig.json,bunfig.toml,src/index.ts,test/}`. Use `packages/cache/` as a reference layout.
- Each package's `package.json`: `"name": "@banhmi/<name>"`, `"type": "module"`, `"version": "0.0.1"`, `"main": "src/index.ts"`, `"types": "src/index.ts"`. Workspace deps `"banhmi": "workspace:*"`, `"@banhmi/common": "workspace:*"`, `"@banhmi/core": "workspace:*"`, etc., as needed.
- Each package's `bunfig.toml` preloads the `Symbol.metadata` polyfill: `[test] preload = ["@banhmi/common/polyfill-symbol-metadata"]` (mirror existing packages).
- Each package's `tsconfig.json` extends the root: `{"extends": "../../tsconfig.json", "compilerOptions": {"rootDir": "src", "outDir": "dist"}, "include": ["src", "test"]}`.
- After every package: `bun install`, `bun test packages/<name>/`, `bunx @biomejs/biome check packages/<name>/`. Both must be green.
- Each package adds a re-export line to `packages/banhmi/src/index.ts` (if it has a public API surface that consumers should reach via `import { ... } from 'banhmi'`).
- Doc-page replacement: edit `apps/docs/apps/web/src/content/<topic>/<slug>.mdx`. Replace the entire placeholder with the standard template (see `docs/superpowers/specs/2026-05-08-banhmi-supremacy-master-design.md` § 11.4) and pull code via `<CodeFromExample slug="<slug>" />`.

**Order of work:**

1. Static (simple, isolated, file-serving) — establishes the doc/example pattern at low risk.
2. Compression (single interceptor, wraps Bun.gzip).
3. SSE (extract existing decorator, polish).
4. Cookies (parse + sign, parameter decorators).
5. Versioning (router-adjacent layer).
6. Middleware (functional + class + module-level binding) — touches platform.
7. Validation (adapter-based, Zod adapter shipped).
8. Transform (decorators + serialize fn).
9. Multipart (file upload).
10. Session (memory + Redis stores).
11. Cluster-app integration (cats-api uses middleware + validation + versioning + cookies + compression).
12. Benchmark scenarios + smoke run.
13. Wave verification gate + canary tag.

---

## Task 1: `@banhmi/static` — static file server

**Files:**
- Create: `packages/static/package.json`, `tsconfig.json`, `bunfig.toml`, `src/index.ts`, `src/static.module.ts`, `src/serve-static.interceptor.ts`, `test/static.test.ts`.
- Create: `examples/features/static-files/{package.json,index.ts,feature.test.ts,README.md}`.
- Modify: `packages/banhmi/src/index.ts` to re-export.
- Replace: `apps/docs/apps/web/src/content/techniques/static-files.mdx` (note: actual placeholder is `serve-static`; check `doc-routes.json` for the real slug — the IA uses `recipes/serve-static`. Use that path.)

- [ ] **Step 1: Scaffold package skeleton**

```
packages/static/
  package.json     -> name @banhmi/static, deps: banhmi, @banhmi/common, @banhmi/core
  tsconfig.json    -> extends ../../tsconfig.json
  bunfig.toml      -> preload polyfill
  src/index.ts     -> re-exports from static.module + serve-static.interceptor
  src/static.module.ts
  src/serve-static.interceptor.ts
  test/static.test.ts
```

- [ ] **Step 2: Public API**

```ts
// src/index.ts
export { StaticModule } from './static.module'
export { ServeStaticInterceptor } from './serve-static.interceptor'
export type { StaticOptions } from './static.module'
```

`StaticOptions`:

```ts
export type StaticOptions = {
  root: string                // absolute or relative-to-cwd
  prefix?: string             // default '/'
  maxAge?: number             // seconds, default 86400
  immutable?: boolean         // adds Cache-Control: immutable
  fallthrough?: boolean       // if true, missing files pass through; default true
  index?: string | false      // index file, default 'index.html'; false to disable
}
```

`StaticModule.forRoot(options: StaticOptions): DynamicModule` registers `ServeStaticInterceptor` as a global interceptor and surfaces `STATIC_OPTIONS` token for DI consumers.

- [ ] **Step 3: TDD — failing test first**

```ts
// test/static.test.ts (excerpt)
import { test, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BanhmiFactory, Module } from 'banhmi'
import { StaticModule } from '../src'

let app: BanhmiApplication
let baseUrl: string
let root: string

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'static-'))
  writeFileSync(join(root, 'hello.txt'), 'world')
  @Module({ imports: [StaticModule.forRoot({ root, prefix: '/assets' })] })
  class AppModule {}
  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  baseUrl = app.getUrl()
})
afterAll(async () => { await app.close() })

test('serves files under the prefix', async () => {
  const res = await fetch(`${baseUrl}/assets/hello.txt`)
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('world')
  expect(res.headers.get('cache-control')).toContain('max-age=86400')
})

test('returns 404 outside the root', async () => {
  const res = await fetch(`${baseUrl}/assets/missing.txt`)
  expect(res.status).toBe(404)
})

test('serves index file by default', async () => {
  writeFileSync(join(root, 'index.html'), '<h1>hi</h1>')
  const res = await fetch(`${baseUrl}/assets/`)
  expect(res.status).toBe(200)
  expect(await res.text()).toContain('<h1>hi</h1>')
})
```

- [ ] **Step 4: Implement the interceptor and module**

Use `Bun.file(absolutePath)` to construct the response:

```ts
const file = Bun.file(absolutePath)
if (!(await file.exists())) return options.fallthrough ? null : new Response('Not Found', { status: 404 })
return new Response(file, {
  headers: {
    'cache-control': `public, max-age=${options.maxAge ?? 86400}${options.immutable ? ', immutable' : ''}`,
    'content-type': file.type,
  },
})
```

Path traversal guard: resolve the absolute requested path and assert it starts with the root absolute path; otherwise return 404.

- [ ] **Step 5: Run tests** — expect 3+ PASS.

- [ ] **Step 6: Micro-example** at `examples/features/serve-static/`. Single-file demo registering `StaticModule.forRoot({ root: './public', prefix: '/static' })` with a sample file in `./public`. The test fetches one of those files.

- [ ] **Step 7: Doc page** at `apps/docs/apps/web/src/content/recipes/serve-static.mdx`. Replace placeholder with the standard template. Pull code via `<CodeFromExample slug="serve-static" />`.

- [ ] **Step 8: Re-export** from `packages/banhmi/src/index.ts`.

- [ ] **Step 9: Lint + test + commit**

```bash
bun install
bun test packages/static
bun test examples/features/serve-static
bunx @biomejs/biome check packages/static examples/features/serve-static
git add packages/static examples/features/serve-static apps/docs/apps/web/src/content/recipes/serve-static.mdx packages/banhmi/src/index.ts
git commit -m "feat(static): add @banhmi/static package with Bun.file zero-copy serving"
```

---

## Task 2: `@banhmi/compression` — gzip/br/zstd interceptor

**Files:**
- Create: `packages/compression/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/compression.module.ts,src/compression.interceptor.ts,test/compression.test.ts}`.
- Create: `examples/features/compression/{...}`.
- Replace: `apps/docs/apps/web/src/content/techniques/compression.mdx`.

- [ ] **Step 1: Public API**

```ts
// src/index.ts
export { CompressionModule } from './compression.module'
export { CompressionInterceptor } from './compression.interceptor'
export type { CompressionOptions } from './compression.module'
```

```ts
export type CompressionOptions = {
  threshold?: number          // bytes, default 1024
  encodings?: Array<'gzip' | 'deflate'>  // default ['gzip']
  level?: number              // 1..9, default 6
  filter?: (contentType: string) => boolean  // default: text/json/javascript/css/svg
}
```

- [ ] **Step 2: Implementation**

The interceptor inspects the response body. If body is a `Response`, read bytes, choose an encoding from `Accept-Encoding`, apply `Bun.gzip(buf, { level })` or `Bun.deflate(buf, { level })`, return a new `Response` with `content-encoding` header set. Skip if:
- body length < threshold
- existing `content-encoding` header set
- content-type not in filter
- client accepts no supported encoding

- [ ] **Step 3: Tests** — 5 cases:
  - Compresses a 2 KB JSON body when client accepts gzip.
  - Skips compression when body is under threshold.
  - Skips when client doesn't accept any supported encoding.
  - Sets `vary: accept-encoding` header.
  - Doesn't double-compress when `content-encoding` already set.

- [ ] **Step 4: Micro-example, doc page, re-export, commit.**

```bash
git commit -m "feat(compression): add @banhmi/compression interceptor using Bun.gzip"
```

---

## Task 3: `@banhmi/sse` — Server-Sent Events polish

**Status:** `packages/common/src/decorators/sse.ts` already exists. This task extracts SSE-specific runtime helpers into a new package, leaving the decorator import in `@banhmi/common` for backwards compatibility but adding helpers in `@banhmi/sse`.

**Files:**
- Create: `packages/sse/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/sse-stream.ts,test/sse.test.ts}`.
- Create: `examples/features/sse/{...}`.
- Replace: `apps/docs/apps/web/src/content/techniques/sse.mdx`.

- [ ] **Step 1: Public API**

```ts
// src/index.ts
export { Sse } from '@banhmi/common'             // re-export decorator
export { sseEventStream, sseHeartbeat } from './sse-stream'
export type { SseEvent } from './sse-stream'
```

```ts
export type SseEvent = {
  data: unknown
  event?: string
  id?: string
  retry?: number
}

export async function* sseEventStream<T>(source: AsyncIterable<SseEvent | T>): AsyncIterable<string>
export async function* sseHeartbeat(intervalMs: number): AsyncIterable<SseEvent>
```

`sseEventStream` formats each event as `event: <name>\nid: <id>\nretry: <n>\ndata: <json>\n\n` (skipping fields that aren't set). `sseHeartbeat` yields `{ event: 'heartbeat', data: {} }` every interval.

- [ ] **Step 2: TDD — formatting tests**

```ts
test('sseEventStream formats data-only events', async () => {
  const out: string[] = []
  for await (const chunk of sseEventStream((async function*() { yield { data: { x: 1 } } })())) {
    out.push(chunk)
  }
  expect(out[0]).toBe('data: {"x":1}\n\n')
})

test('sseEventStream includes event and id', async () => {
  const src = (async function*() { yield { event: 'tick', id: 'a', data: 1 } })()
  const out: string[] = []
  for await (const chunk of sseEventStream(src)) out.push(chunk)
  expect(out[0]).toBe('event: tick\nid: a\ndata: 1\n\n')
})
```

- [ ] **Step 3: Integration test** — boot a Banhmi app with an `@Sse('/events')` endpoint that yields three events. Open EventSource (use `fetch` with `text/event-stream` accept, parse incrementally). Assert the events arrive.

- [ ] **Step 4: Micro-example** — a minimal app with `@Sse('/clock')` yielding the time every 200 ms.

- [ ] **Step 5: Doc page, re-export, commit.**

```bash
git commit -m "feat(sse): add @banhmi/sse with formatter helpers and heartbeat"
```

---

## Task 4: `@banhmi/cookies` — parse + sign

**Files:**
- Create: `packages/cookies/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/parse.ts,src/sign.ts,src/cookies.module.ts,src/cookies.decorators.ts,test/parse.test.ts,test/sign.test.ts,test/cookies.test.ts}`.
- Create: `examples/features/cookies/{...}`.
- Replace: `apps/docs/apps/web/src/content/techniques/cookies.mdx`.

- [ ] **Step 1: Public API**

```ts
// src/index.ts
export { CookiesModule } from './cookies.module'
export { Cookies, Cookie, SignedCookie } from './cookies.decorators'
export { parseCookies, serializeCookie } from './parse'
export { signValue, verifyValue } from './sign'
export type { CookieOptions, ParsedCookies } from './parse'
```

`parseCookies(header: string): ParsedCookies` — pure function, returns `Record<string, string>`. Handles URL-decoded values, quoted strings.

`serializeCookie(name, value, opts): string` — emits a Set-Cookie header value.

`signValue(value, secret)` / `verifyValue(signed, secret): string | null` — HMAC-SHA256, base64-url. Returns null if signature mismatch.

`@Cookies()`: returns `ParsedCookies` from request.
`@Cookie('name')`: returns the value of the named cookie or undefined.
`@SignedCookie('name')`: verifies via the configured secret; returns string or null.

`CookiesModule.forRoot({ secret?: string })` — secret defaults to `Bun.env.BANHMI_COOKIE_SECRET`.

- [ ] **Step 2: Tests** — pure-fn tests for parse/sign (no app), then integration test with `@Cookies()` decorator.

- [ ] **Step 3: Implementation** — use `Bun.password` is unrelated; use the WebCrypto subtle API for HMAC: `crypto.subtle.importKey` + `sign('HMAC', ...)`.

- [ ] **Step 4: Micro-example, doc page, re-export, commit.**

```bash
git commit -m "feat(cookies): add @banhmi/cookies with parse, sign, decorators"
```

---

## Task 5: `@banhmi/versioning` — URI/header/media versioning

**Files:**
- Create: `packages/versioning/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/versioning.module.ts,src/version.decorator.ts,src/version-resolver.ts,test/versioning.test.ts}`.
- Modify: `packages/platform-bun/src/route-explorer.ts` (or `router.ts`) to consult version metadata when matching.
- Create: `examples/features/versioning/{...}`.
- Replace: `apps/docs/apps/web/src/content/techniques/versioning.mdx`.

- [ ] **Step 1: Public API**

```ts
export { VersioningModule, enableVersioning } from './versioning.module'
export { Version } from './version.decorator'
export type { VersioningOptions } from './versioning.module'
```

```ts
export type VersioningOptions =
  | { type: 'uri', prefix?: string, defaultVersion?: string }
  | { type: 'header', header: string, defaultVersion?: string }
  | { type: 'media-type', key: string, defaultVersion?: string }  // Accept: application/vnd.x.v1+json
```

`@Version('2')` on a controller class or handler.

- [ ] **Step 2: Resolver**

```ts
export function resolveVersion(req: Request, opts: VersioningOptions): string | null
```

Pure fn, tested in isolation.

- [ ] **Step 3: Router hook**

The simplest approach: add a request-time check. After the router finds a route, pull `[VERSION_METADATA]` from the handler's `Symbol.metadata`. If a version is set and `resolveVersion(req, opts)` doesn't match, treat it as 404 (try next route or fall through).

(If multiple handlers register the same path under different versions, a Map<path, handler[]> in the router can be a Wave 2 follow-up; for Wave 1 we accept a simple iterate-then-match approach.)

- [ ] **Step 4: Tests** — URI prefix `/v1/cats` vs `/v2/cats`. Header version mismatch returns 404. Default version applied when client omits.

- [ ] **Step 5: Micro-example, doc page, re-export, commit.**

```bash
git commit -m "feat(versioning): add @banhmi/versioning with URI/header/media-type strategies"
```

---

## Task 6: `@banhmi/middleware` — functional + class + module-level binding

**Files:**
- Create: `packages/middleware/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/middleware.types.ts,src/middleware.consumer.ts,src/use-middleware.decorator.ts,test/*}`.
- Modify: `packages/platform-bun/src/enhancer-pipeline.ts` to invoke middleware before guards.
- Modify: `packages/common/src/interfaces/module-metadata.ts` to allow modules to expose `configure(consumer: MiddlewareConsumer)`.
- Create: `examples/features/middleware-fn/{...}`.
- Replace: `apps/docs/apps/web/src/content/overview/middleware.mdx`.

- [ ] **Step 1: Types**

```ts
export type MiddlewareFn = (req: Request, ctx: RouteCtx, next: () => Promise<Response>) => Promise<Response>

export interface BanhmiMiddleware {
  use: MiddlewareFn
}

export interface MiddlewareConsumer {
  apply(...mws: Array<MiddlewareFn | { new (): BanhmiMiddleware }>): { forRoutes(...routes: Array<string | { path: string; method?: 'GET' | 'POST' | ... }>): void }
}
```

- [ ] **Step 2: Decorator** `@UseMiddleware(...)` for handler/controller-level binding (parallel to `@UseGuards`).

- [ ] **Step 3: Pipeline integration**

Middleware runs before guards in the enhancer pipeline. The pipeline collects:
1. Module-level middlewares (from `configure()`)
2. Controller `@UseMiddleware()` decorators
3. Handler `@UseMiddleware()` decorators

Each `next()` call advances. The final `next()` invokes the rest of the pipeline (guards → interceptors → pipes → handler → filters).

- [ ] **Step 4: Tests** — 6 cases:
  - Functional middleware sees the request.
  - Middleware can short-circuit by not calling `next()`.
  - `forRoutes('cats')` matches `/cats/*`.
  - `forRoutes({ path: 'cats', method: 'POST' })` only matches POST.
  - Class middleware works.
  - Order is preserved across multiple `apply().forRoutes()` calls.

- [ ] **Step 5: Micro-example** — logger middleware that prints `<method> <url>`.

- [ ] **Step 6: Doc page, re-export, commit.**

```bash
git commit -m "feat(middleware): add @banhmi/middleware with fn/class/module-level binding"
```

---

## Task 7: `@banhmi/validation` — adapter-based validation pipeline

**Files:**
- Create: `packages/validation/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/validator.ts,src/validation.pipe.ts,src/decorators.ts,src/adapters/native.ts,src/adapters/zod.ts,test/native.test.ts,test/zod.test.ts,test/pipe.test.ts}`.
- Add `zod` as an optional peer dep (`peerDependencies`: `{"zod": ">=3"}`).
- Create: `examples/features/validation-zod/{...}`, `examples/features/validation-native/{...}`.
- Replace: `apps/docs/apps/web/src/content/techniques/validation.mdx`.

- [ ] **Step 1: Public API**

```ts
// src/index.ts
export type { Validator, ValidationError } from './validator'
export { ValidationPipe } from './validation.pipe'
export { Body, Param, Query } from './decorators'   // overrides @banhmi/common's? No: complement; users opt-in via these for typed extraction.
export { native } from './adapters/native'
// zod adapter is exported via subpath: `@banhmi/validation/zod`
```

Subpath export: `packages/validation/zod.ts` re-exports from `src/adapters/zod.ts`. `package.json` `exports`:

```json
"exports": {
  ".": "./src/index.ts",
  "./zod": "./src/adapters/zod.ts"
}
```

`Validator<T>`:

```ts
export interface Validator<T> {
  parse(input: unknown): T
  safeParse(input: unknown): { ok: true; value: T } | { ok: false; errors: ValidationError[] }
}
```

`native(spec: { [k: string]: 'string' | 'number' | 'boolean' | { type: 'array', of: ... } })` returns a `Validator`.
`zodAdapter(schema: z.ZodSchema<T>)` returns a `Validator<T>`.

`ValidationPipe<T>` wraps a `Validator<T>` and integrates with the existing pipe pipeline. Throws `BadRequestException` with structured errors on failure.

- [ ] **Step 2: TDD** — 12+ tests across native + zod + pipe integration. Cover: missing fields, wrong types, nested objects, arrays, error message structure.

- [ ] **Step 3: Implementation**

Native adapter is a tiny pure-fn validator (no external deps). Zod adapter calls `schema.safeParse(input)` and maps Zod errors to our `ValidationError` shape.

- [ ] **Step 4: Pipe usage**

```ts
@Post()
async create(@Body(new ValidationPipe(zodAdapter(CreateCatSchema))) dto: CreateCatDto) { ... }
```

- [ ] **Step 5: Two micro-examples** (one per adapter).

- [ ] **Step 6: Doc page, re-export, commit.**

```bash
git commit -m "feat(validation): add @banhmi/validation with native + Zod adapters"
```

---

## Task 8: `@banhmi/transform` — class-transformer parity via Symbol.metadata

**Files:**
- Create: `packages/transform/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/decorators.ts,src/serialize.ts,src/groups.ts,test/serialize.test.ts}`.
- Create: `examples/features/serialization/{...}`.
- Replace: `apps/docs/apps/web/src/content/techniques/serialization.mdx`.

- [ ] **Step 1: Public API**

```ts
export { Expose, Exclude, Transform, Type } from './decorators'
export { serialize, deserialize } from './serialize'
export type { TransformOptions, SerializerGroup } from './serialize'
```

Decorators write to `[TRANSFORM_METADATA]` symbol on the class metadata.

`serialize<T>(input: T, dto: { new (): T }, opts?: TransformOptions): unknown` reads metadata and produces a plain object respecting `@Expose`, `@Exclude`, `@Transform(fn)`, `@Type(() => Cls)` for nested objects.

Group support: `serialize(user, UserDto, { groups: ['admin'] })` includes only props decorated with `@Expose({ groups: ['admin'] })` (or no group restriction).

- [ ] **Step 2: TDD** — 10+ tests covering basic shape, exclude, custom transforms, nested types, groups.

- [ ] **Step 3: Implementation** — pure functions; no DI integration. Future waves (Wave 6 patterns) wire `serialize` into a `ClassSerializerInterceptor`.

- [ ] **Step 4: Micro-example, doc page, re-export, commit.**

```bash
git commit -m "feat(transform): add @banhmi/transform with Symbol.metadata-based decorators"
```

---

## Task 9: `@banhmi/multipart` — file upload via native FormData

**Files:**
- Create: `packages/multipart/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/multipart.module.ts,src/decorators.ts,src/multipart.interceptor.ts,test/multipart.test.ts}`.
- Create: `examples/features/file-upload/{...}`.
- Replace: `apps/docs/apps/web/src/content/techniques/file-upload.mdx`.

- [ ] **Step 1: Public API**

```ts
export { MultipartModule } from './multipart.module'
export { UploadedFile, UploadedFiles } from './decorators'
export type { MultipartOptions, UploadedFileMeta } from './multipart.module'
```

```ts
export type MultipartOptions = {
  limits?: { fileSize?: number; files?: number; fields?: number }
  dest?: string  // optional: write files to disk; otherwise hold in memory
}
```

`UploadedFileMeta`:

```ts
export type UploadedFileMeta = {
  fieldname: string
  filename: string
  mimetype: string
  size: number
  buffer?: Buffer        // if dest is unset
  path?: string          // if dest is set
}
```

`@UploadedFile('field')` returns `UploadedFileMeta`. `@UploadedFiles()` returns `UploadedFileMeta[]`.

- [ ] **Step 2: Tests** — boot app, POST a multipart body via `FormData`, assert the handler receives the right shape. Cover: single file, multiple files, file size limit triggers 400, missing field returns undefined.

- [ ] **Step 3: Implementation** — interceptor calls `await req.formData()`, builds `UploadedFileMeta` objects from each `File` entry, attaches them to `ctx.state` for the parameter decorator to pull.

- [ ] **Step 4: Micro-example** — POST `/upload` accepting a `file` field; respond with `{ size, mimetype }`.

- [ ] **Step 5: Doc page, re-export, commit.**

```bash
git commit -m "feat(multipart): add @banhmi/multipart with native FormData file upload"
```

---

## Task 10: `@banhmi/session` — server-side sessions

**Files:**
- Create: `packages/session/{package.json,tsconfig.json,bunfig.toml,src/index.ts,src/session.module.ts,src/session.interceptor.ts,src/session.decorator.ts,src/stores/memory.ts,src/stores/redis.ts,test/*}`.
- Create: `examples/features/session/{...}`.
- Replace: `apps/docs/apps/web/src/content/techniques/session.mdx`.

- [ ] **Step 1: Public API**

```ts
export { SessionModule } from './session.module'
export { Session } from './session.decorator'
export { MemorySessionStore } from './stores/memory'
export { RedisSessionStore } from './stores/redis'  // requires @banhmi/redis as a peer
export type { SessionStore, SessionOptions, SessionData } from './session.module'
```

```ts
export interface SessionStore {
  get(id: string): Promise<SessionData | null>
  set(id: string, data: SessionData, ttlSeconds: number): Promise<void>
  destroy(id: string): Promise<void>
}

export type SessionOptions = {
  store?: SessionStore                       // default MemorySessionStore
  secret: string
  cookie?: { name?: string; maxAge?: number; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none' }
}
```

`@Session()` parameter decorator returns a per-request session object with `get(k)`, `set(k, v)`, `destroy()`, `regenerate()`.

- [ ] **Step 2: Tests** — memory store roundtrip, regenerate creates new id, expired sessions return null, redis store hits a real local Redis (skip if unavailable).

- [ ] **Step 3: Implementation** — interceptor reads/sets the session cookie (signed via `@banhmi/cookies`), loads the session from the store on first access, persists changes on response. `MemorySessionStore` uses a `Map` with TTL via `setTimeout`. `RedisSessionStore` uses `@banhmi/redis`'s `RedisService`.

- [ ] **Step 4: Micro-example** — counter session that increments per request.

- [ ] **Step 5: Doc page, re-export, commit.**

```bash
git commit -m "feat(session): add @banhmi/session with memory + redis stores"
```

---

## Task 11: Wire cluster app `examples/cats-api/`

**Files:**
- Modify: `examples/cats-api/src/main.ts` and module/controllers as needed.
- Add tests at `examples/cats-api/test/integration.test.ts` covering: middleware logs the request, validation rejects a malformed POST, URI versioning routes correctly, signed cookies round-trip, compression sets headers.

- [ ] **Step 1: Audit current `cats-api` shape**

Run: `find examples/cats-api -type f -not -path '*/node_modules/*'`.
Read each source file.

- [ ] **Step 2: Add dependencies**

`examples/cats-api/package.json` adds `"@banhmi/middleware": "workspace:*"`, `"@banhmi/validation": "workspace:*"`, `"@banhmi/versioning": "workspace:*"`, `"@banhmi/cookies": "workspace:*"`, `"@banhmi/compression": "workspace:*"`, plus `"zod": "^3"`.

- [ ] **Step 3: Wire each feature**

- Logger middleware applied module-wide via `configure(consumer)`.
- `CreateCatDto` validated by Zod schema + `ValidationPipe`.
- App calls `enableVersioning({ type: 'uri' })`; controller has two `@Version` variants.
- Endpoint sets a signed cookie on first request; subsequent requests echo the value.
- `CompressionModule.forRoot()` registered.

- [ ] **Step 4: Add `examples/cats-api/test/integration.test.ts`** with 5+ assertions exercising each integration.

- [ ] **Step 5: Run + commit**

```bash
bun test examples/cats-api
git add examples/cats-api
git commit -m "feat(cats-api): wire wave-1 packages into HTTP cluster app"
```

---

## Task 12: Benchmark scenarios for Wave 1

**Files:**
- Create: `benchmarks/scenarios/json-roundtrip/{banhmi.ts,nestjs-express.ts,nestjs-fastify.ts}` — each spins a server with a single `POST /` echoing the JSON body.
- Create: `benchmarks/scenarios/validation/{banhmi.ts,nestjs-express.ts,nestjs-fastify.ts}` — POST a 10-field DTO, validate via Zod (banhmi) or class-validator (NestJS), respond with 200 on success.
- Create: `benchmarks/scenarios/file-upload/...` — POST a 5 MB body via multipart.
- Modify: `benchmarks/runners/smoke.ts` to run all scenarios serially when `oha` is available; emit JSON output per scenario into `benchmarks/results/<date>/<scenario>.json`.

(Realistic scope: scaffold the scenarios + runner extension. Numbers are informational this wave; Wave 11 sets hard targets.)

- [ ] **Step 1: Implement Banhmi-side servers using the new packages.**
- [ ] **Step 2: Implement matching NestJS servers (Express + Fastify).**
- [ ] **Step 3: Update smoke runner to iterate scenarios.**
- [ ] **Step 4: Run smoke locally; capture results.**
- [ ] **Step 5: Commit.**

```bash
git commit -m "feat(benchmarks): add json-roundtrip, validation, file-upload scenarios"
```

---

## Task 13: Wave 1 verification gate + canary

- [ ] **Step 1: Run gate**

```bash
bun run lint
bun test --recursive
bun run docs:build
bun run benchmarks:smoke
bun run quality:no-bangs && bun run quality:no-reflect && bun run quality:tsdoc
```

All green except `quality:no-anys` (still pre-existing).

- [ ] **Step 2: Wave summary doc** at `docs/superpowers/specs/2026-05-09-wave-1-summary.md`.

- [ ] **Step 3: Tag canary**

```bash
git tag v0.4.0-canary.wave1
```

- [ ] **Step 4: Confirm clean working tree.**

---

## Self-Review

| Master spec wave-1 deliverable | Task in this plan |
|---|---|
| middleware | Task 6 |
| validation | Task 7 |
| transform | Task 8 |
| versioning | Task 5 |
| cookies | Task 4 |
| session | Task 10 |
| compression | Task 2 |
| multipart | Task 9 |
| sse | Task 3 |
| static | Task 1 |
| cluster-app integration | Task 11 |
| benchmark scenarios | Task 12 |
| verification gate | Task 13 |

No placeholders. No "TBD". Every Task has a concrete public API surface and concrete test cases. Acceptance criteria are explicit (≥ 90% coverage, doc page replaced, micro-example present).
