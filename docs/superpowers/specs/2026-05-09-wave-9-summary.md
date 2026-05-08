# Wave 9 — Edge & Serverless Summary

**Date:** 2026-05-09
**Tag:** v0.12.0-canary.wave9
**Predecessor:** v0.11.0-canary.wave8 (1305 tests)
**Final test count:** 1338 pass, 0 fail, 41 skip (across 208 files)
**Net new tests:** +33

---

## Gate results

| Check | Result |
|-------|--------|
| `bun test --recursive` | 1338 pass / 0 fail |
| `bun run quality:no-anys` | 6 violations (pre-existing in packages/common) |
| `bun run quality:no-bangs` | clean |
| `bun run quality:no-reflect` | clean |
| `bun run lint` | 0 errors / 4 infos (pre-existing) |
| Working tree clean | yes |

---

## Tasks shipped

### Task 1 — `@banhmi/edge` (Commit: 9544278)

New package `packages/edge/` with:
- `createEdgeHandler(AppModule, opts?)` → `(req: Request) => Promise<Response>`
- `EdgeHandlerOptions.globalPrefix` for URL prefix stripping
- Uses `BanhmiApplication.init()` + `BunAdapter.dispatchRequest()` internally
- **7 tests** in `packages/edge/test/edge-adapter.test.ts`

Files: `package.json`, `tsconfig.json`, `bunfig.toml`, `src/index.ts`,
`src/edge-adapter.ts`, `src/types.ts`, `test/edge-adapter.test.ts`

### Task 2 — `@banhmi/serverless` (Commit: cd388a9)

New package `packages/serverless/` with:
- `createLambdaHandler(AppModule, opts?)` → Lambda handler function
- Auto-detects API Gateway v1 vs v2 event format
- `binaryMimeTypes` option for base64-encoding response bodies
- `src/api-gateway-v1.ts` and `src/api-gateway-v2.ts` for event → Request translation
- **11 tests** in `packages/serverless/test/lambda-adapter.test.ts`

Files: `package.json`, `tsconfig.json`, `bunfig.toml`, `src/index.ts`,
`src/lambda-adapter.ts`, `src/api-gateway-v1.ts`, `src/api-gateway-v2.ts`,
`src/types.ts`, `test/lambda-adapter.test.ts`

### Task 3 — Hybrid app (Commit: 6575b36)

Modified `packages/core/src/application.ts`:
- `BanhmiApplication.connectMicroservice(opts: MicroserviceOptions): this`
- `BanhmiApplication.startAllMicroservices(): Promise<void>`
- `BanhmiApplication.init()` extracted from `listen()` (enables edge/serverless use)
- `MicroserviceOptions` interface exported from `@banhmi/core`
- **3 tests** in `packages/core/test/hybrid-app.test.ts`

### Task 4 — Raw body + HTTPS + keep-alive (Commit: 1c0b3fc)

Modified `packages/platform-bun/src/`:
- `BunAdapterOptions.rawBody: boolean` — populates `ctx.rawBody: Uint8Array`
- `BunAdapterOptions.https: { key, cert }` — TLS via `Bun.serve`
- `BunAdapterOptions.idleTimeout: number` — keep-alive idle timeout
- `BunAdapter.dispatchRequest(req)` — public `Request → Response` method
- `BanhmiFactory.create(AppModule, opts?)` now accepts `BunAdapterOptions`
- `BunRouteCtx` carries optional `rawBody: Uint8Array`
- `RouteCtx` interface updated with optional `rawBody` field
- **3 tests** in `packages/platform-bun/test/raw-body.test.ts`

### Task 5 — Request lifecycle docs (Commit: 9a5f44b)

Replaced `apps/docs/apps/web/src/content/deployment/request-lifecycle.mdx`
with a full text-based pipeline diagram covering all 8 stages.

### Task 6 — HTTPS (included in Task 4)

`BunAdapterOptions.https` enables HTTPS. Documented in
`deployment/https-and-multiple-servers.mdx`.

### Task 7 — Hot reload docs (Commit: 455765f)

Replaced all remaining deployment placeholder docs:
`edge.mdx`, `hot-reload.mdx`, `https-and-multiple-servers.mdx`,
`hybrid.mdx`, `keep-alive.mdx`, `raw-body.mdx`, `standalone-apps.mdx`,
`common-errors.mdx`

### Task 8 — Examples + FAQ docs (Commits: 7f809b7, e3350cf)

New examples:
- `examples/edge-worker/` — Bun.serve wrapper for local dev, 4 integration tests
- `examples/lambda-app/` — Lambda handler example, 6 integration tests

Replaced all 10 FAQ placeholder docs:
`serverless.mdx`, `http-adapter.mdx`, `keep-alive.mdx`,
`global-path-prefix.mdx`, `raw-body.mdx`, `hybrid-application.mdx`,
`https-and-multiple-servers.mdx`, `request-lifecycle.mdx`,
`common-errors.mdx`, `examples.mdx`

---

## Deferred

- `app.listenAdditional({ port, tls })` (multiple servers from same app instance) — not implemented;
  the documented approach is two separate `BanhmiFactory.create` calls.
- `BanhmiHmrModule` (singleton invalidation on file change) — deferred; `bun --watch` is sufficient.

---

## Assessment

**WAVE_9_DONE**
