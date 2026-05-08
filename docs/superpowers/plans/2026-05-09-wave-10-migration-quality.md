# Wave 10 — Migration & Quality Implementation Plan

**Predecessor:** Wave 9 (Edge & Serverless) — `v0.12.0-canary.wave9`, 1338 tests.
**Goal:** Production hardening pass. Migrate-from-NestJS guide + codemods, production checklist, security audit, fix the 6 pre-existing `any` violations, add perf budgets per package.

## Tasks

1. **Fix the 6 pre-existing `: any` violations** in `packages/common/src/{decorators,interfaces}/*.ts`. Each needs a typed alternative: `unknown`, generics, or a concrete interface. The existing `biome-ignore` comments come off.

2. **Migrate-from-NestJS guide** at `apps/docs/apps/web/src/content/migration/{concepts,codemods,compat}.mdx`. Concept page: side-by-side mapping for the top 30 NestJS features. Codemods page: documents the codemods script (Task 3). Compat page: known incompatibilities + workarounds.

3. **Codemods**: a Bun script at `scripts/codemods/nestjs-to-banhmi.ts` that performs source rewrites:
   - `@nestjs/common` → `@banhmi/common`
   - `@nestjs/core` → `@banhmi/core`
   - `@Inject(TOKEN) private foo: T` constructor params → `static inject = [TOKEN] as const` + plain constructor params
   - `@nestjs/swagger` → `@banhmi/openapi`
   - `@nestjs/jwt` → `@banhmi/jwt`
   - Other common rewrites (config, throttler, etc.)
   Tests cover each rewrite as a pure-fn unit test.

4. **Production checklist** at `apps/docs/apps/web/src/content/production/index.mdx`. Topics: env vars, logging level, security headers, CORS allowlist, rate-limit, JWT secret rotation, DB migrations, health checks, OTel tracing, structured logs, error reporting (Sentry), graceful shutdown, container image best practices, port/host binding, reverse-proxy gotchas (X-Forwarded-*), TLS termination.

5. **Security audit** — run the `superpowers:security-review` skill on the cumulative diff vs the start of the programme (or, if that's too heavy, run on the security-relevant packages: `@banhmi/auth`, `@banhmi/security`, `@banhmi/crypto`, `@banhmi/cookies`, `@banhmi/session`, `@banhmi/jwt`). Report findings; fix high-severity items in this wave; defer medium to a follow-up if not urgent.

6. **Perf budgets** — each package gets a `## Perf budget` section in its README listing: max RSS at idle (target), max startup time (target), max p99 latency on a representative endpoint (target). Numbers are aspirational pre-Wave-11; Wave 11 measures and adjusts.

7. **Verification gate** + canary tag `v0.13.0-canary.wave10`. The gate now expects `quality:no-anys` to be CLEAN (the 6 are fixed).

## Working order

1 → 2 → 3 → 4 → 5 → 6 → 7. Each its own commit.
