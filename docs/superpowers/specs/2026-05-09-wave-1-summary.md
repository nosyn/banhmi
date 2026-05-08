# Wave 1 — HTTP & Validation Summary

**Predecessor:** Wave 0 (foundation) — `v0.3.0-canary.wave0`
**Tag:** `v0.4.0-canary.wave1`

## Packages shipped (10)

- `@banhmi/static` — Bun.file zero-copy static file server.
- `@banhmi/compression` — Bun.gzip/deflate response compression with Accept-Encoding negotiation.
- `@banhmi/sse` — Server-Sent Events helpers (`sseEventStream`, `sseHeartbeat`).
- `@banhmi/cookies` — parse + HMAC-signed cookies, `@Cookies` / `@Cookie` / `@SignedCookie` decorators.
- `@banhmi/versioning` — URI / header / media-type versioning, `@Version` decorator.
- `@banhmi/middleware` — functional + class middleware, module-level `configure(consumer)`, `@UseMiddleware` decorator.
- `@banhmi/validation` — adapter-based validation; native + Zod adapters; `AdaptedValidationPipe`.
- `@banhmi/transform` — class-transformer parity via `Symbol.metadata`; `@Expose`, `@Exclude`, `@Transform`, `@Type`; `serialize()`.
- `@banhmi/multipart` — file upload via native `Request.formData()`; `@UploadedFile`, `@UploadedFiles` decorators.
- `@banhmi/session` — server-side sessions; memory + redis stores; `@Session` decorator.

## Platform extensions

- `HTTP_ADAPTER_TOKEN` exported from `@banhmi/platform-bun`; modules can hook the adapter via `OnApplicationBootstrap`.
- `BunRouter.matchAll()` returns multiple candidates for version-aware dispatch.
- Module-tree `configure(consumer)` walked during `BanhmiApplication.listen()` for module-level middleware binding.
- `runEnhancerPipeline` accepts an optional middleware chain that runs before guards.
- `BanhmiApplication.getUrl()` exposes the bound URL for tests and tooling.

## Cluster app

`examples/cats-api/` wires logger middleware, Zod validation, URI versioning (`v1`/`v2`), signed-cookie session id, and gzip compression. Integration test asserts each.

## Benchmarks

`json`, `validate` scenarios run on all three competitors (Banhmi, NestJS@Express, NestJS@Fastify). `upload` scenario runs on Banhmi + NestJS@Express; the NestJS@Fastify upload endpoint is stubbed pending `@fastify/multipart` adapter integration (tracked for Wave 11).

## Tests

698 pass, 0 fail (698 tests across 111 files).

## Known follow-ups

- Pre-existing 6 `: any` violations in `packages/common/` still untouched (originally documented in `2026-05-08-wave-0-anys-followup.md`).
- NestJS@Fastify upload endpoint stubbed (`benchmarks/competitors/nestjs-fastify/src/body.controller.ts`).
- Compression body-stream consumption fix in `packages/compression/src/compression.middleware.ts` was uncovered during cats-api integration; package tests cover it now.

## Verification gate

All eight commands listed in the plan exited 0 (or `quality:no-anys` flagged only the documented pre-existing violations).
