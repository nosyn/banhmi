# Wave 1 — HTTP & Validation Design Specification

**Date:** 2026-05-09
**Status:** Approved (per master design 2026-05-08; no separate user gate per user's autonomy directive)
**Predecessor:** Wave 0 (foundation) — `v0.3.0-canary.wave0`
**Successor:** Wave 2 (security)

## 1. Scope

Ship 10 new packages closing the HTTP fundamentals gap vs NestJS, plus a richer validation pipeline than NestJS provides out of the box.

| # | Package | Replaces / parallels |
|---|---|---|
| 1 | `@banhmi/middleware` | `@nestjs/common` middleware (functional + class) |
| 2 | `@banhmi/validation` | `@nestjs/common` `ValidationPipe` + class-validator |
| 3 | `@banhmi/transform` | class-transformer (`@nestjs/common` serialization) |
| 4 | `@banhmi/versioning` | `@nestjs/common` URI/header/media versioning |
| 5 | `@banhmi/cookies` | `cookie-parser` + signed cookies |
| 6 | `@banhmi/session` | `express-session` parity, memory + redis stores |
| 7 | `@banhmi/compression` | `compression` middleware via `Bun.gzip` / `Bun.deflate` |
| 8 | `@banhmi/multipart` | `multer` parity via native `FormData` |
| 9 | `@banhmi/sse` | extract / polish existing SSE decorator |
| 10 | `@banhmi/static` | `serve-static` middleware via `Bun.file` |

## 2. Cross-cutting design decisions

### 2.1 Adapter-based validation

`@banhmi/validation` exposes a `Validator<T>` interface that schema libraries adapt to:

```ts
interface Validator<T> {
  parse(input: unknown): T              // throws BadRequestException
  safeParse(input: unknown): { ok: true; value: T } | { ok: false; errors: ValidationError[] }
}
```

Adapters shipped: `zod`, `valibot`, `arktype`, plus a built-in `native` adapter for simple shape checks without an external dep. Each adapter is its own subpath import (`@banhmi/validation/zod`, etc.) so users only pay for what they use.

### 2.2 Transform pipeline as decorators

`@banhmi/transform` exposes `@Transform(fn)` (property), `@Expose()`, `@Exclude()`, `@Type(() => Cls)` decorators driven by `Symbol.metadata` (no `class-transformer` dep). A `serialize(input, dto)` function applies transforms and groups in order.

### 2.3 Middleware ordering

`@banhmi/middleware` adds:
- Functional middleware: `(req, ctx, next) => Response | Promise<Response>` matching the `RouteCtx` shape from `packages/common/src/interfaces/route-ctx.ts`.
- Class middleware: classes with `use(req, ctx, next)`.
- Module-level binding: `consumer.apply(...).forRoutes(...)` like NestJS.
- `@UseMiddleware()` decorator at controller/handler level.

Middleware runs **before** Guards in the pipeline (matching NestJS).

### 2.4 Versioning

URI versioning: `app.enableVersioning({ type: 'uri', prefix: 'v' })`.
Header versioning: `app.enableVersioning({ type: 'header', header: 'X-API-Version' })`.
Media-type versioning: `Accept: application/vnd.banhmi.v1+json`.
Per-handler `@Version('2')` overrides default.

### 2.5 Cookies

`@Cookies()` parameter decorator returns parsed cookies. `@Cookie('name')` returns a single one. `res.cookie(name, value, opts)` and `res.signedCookie(...)` set them. Signing key from `BANHMI_COOKIE_SECRET` env or explicit module config.

### 2.6 Session

`SessionModule.forRoot({ store: 'memory' | RedisSessionStore, secret, cookie })` registers a `Session` per request via interceptor. `@Session()` parameter decorator surfaces it; `req.session.set(k, v)` / `req.session.get(k)` API.

### 2.7 Compression

Interceptor wraps the response body. Negotiates `Accept-Encoding`. Uses `Bun.gzip`, `Bun.deflate`. Adds `Content-Encoding` header. Threshold (default 1 KB) skips small bodies.

### 2.8 Multipart

`@UploadedFile('field')`, `@UploadedFiles()` parameter decorators. Backed by native `request.formData()`. Each file is a Bun `File` instance (a `Blob` subclass). Module-level config: `MultipartModule.forRoot({ limits: { fileSize: 5_000_000 }, dest?: '...' })`.

### 2.9 SSE

`@Sse('/events')` returns an `AsyncIterable<MessageEvent>`. Existing `packages/common/src/decorators/sse.ts` becomes the public API; the platform-bun adapter writes `text/event-stream` headers and pumps events.

### 2.10 Static

`StaticModule.forRoot({ root: 'public', prefix: '/static', maxAge: 86400 })`. Backend uses `Bun.file()` for zero-copy responses. Etag + last-modified caching.

## 3. Interface stability

All public exports go through the package's `src/index.ts` and re-export through `packages/banhmi/src/index.ts`. Decorators write metadata via the existing `Symbol.metadata` pattern (see `packages/common/src/decorators/*`). DI uses `static inject = [...] as const`.

## 4. Acceptance criteria (per package)

A Wave 1 package is **done** only when ALL of:

1. `packages/<name>/src/index.ts` exports the public API (every symbol has TSDoc with `@example`).
2. `packages/<name>/test/*.test.ts` covers ≥ 90% of `src/`. (Coverage measured with `bun test --coverage`.)
3. `examples/features/<slug>/` micro-example exists with `index.ts`, `feature.test.ts`, `README.md`, `package.json`. Test boots a real server and asserts behaviour.
4. Doc page at `apps/docs/apps/web/src/content/<topic>/<slug>.mdx` replaces the placeholder; uses `<CodeFromExample slug="<slug>" />` to pull live code.
5. `packages/banhmi/src/index.ts` re-exports the new public API.
6. Package added to relevant slugs in `apps/docs/apps/web/src/content/doc-routes.json` if any new sub-pages are needed.
7. Quality gates clean: `bun run lint`, `bun run quality:no-bangs`, `bun run quality:no-reflect`, `bun run quality:tsdoc`. (`quality:no-anys` may show pre-existing violations; those are tracked separately.)

## 5. Cluster-app integration

`examples/cats-api/` (existing HTTP-fundamentals demo) gets wired to use:
- `@banhmi/middleware` for a logging middleware
- `@banhmi/validation` (Zod adapter) on the `CreateCatDto`
- `@banhmi/versioning` with URI versioning
- `@banhmi/cookies` for a session-id round-trip
- `@banhmi/compression` interceptor

The cluster app's existing tests stay green plus new tests cover each integration.

## 6. Benchmark additions

New scenarios:
- `benchmarks/scenarios/validation/` — POST a 10-field DTO, validate via Zod adapter, return 200.
- `benchmarks/scenarios/file-upload/` — POST a 5 MB multipart file.
- `benchmarks/scenarios/json-roundtrip/` — POST 1 KB JSON, echo it back.

Run targets (informational this wave; hard gates in Wave 11):
- Validation: ≥ 1.5× NestJS@Fastify RPS.
- File upload: ≥ 1.3× NestJS@Express.
- JSON: ≥ 2× NestJS@Express, ≥ 1.3× NestJS@Fastify.

## 7. Verification gate

End of wave:

```bash
bun run lint
bun test --recursive
bun run docs:build
bun run benchmarks:smoke
bun run quality:no-bangs && bun run quality:no-reflect && bun run quality:tsdoc
```

All green. `quality:no-anys` may still report pre-existing violations (see Wave 1 follow-up doc); the new packages add zero new violations.

Tag canary: `v0.4.0-canary.wave1`.

## 8. Risks

| Risk | Mitigation |
|---|---|
| 10 packages in one wave is wide; integration churn | One package per implementer dispatch; combined review per package; cluster-app integration in a final task |
| Adapter-based validation is novel | Start with Zod + native adapters only; Valibot + ArkType are stretch goals (deferred to Wave 1.5 if needed) |
| Multipart on Bun's native FormData has quirks | Pin Bun version in CI; fallback to streaming if FormData buffers too aggressively |
| Compression interceptor could double-compress | Detect `Content-Encoding` already set; skip in that case |
| Versioning needs router changes | Keep it additive — don't refactor `RadixRouter`, just add a version-aware lookup layer |

## 9. Out of scope

- HTTPS support (Wave 9 deployment).
- Raw body parsing (Wave 9).
- Hot reload (Wave 9).
- Hybrid app (Wave 9).
