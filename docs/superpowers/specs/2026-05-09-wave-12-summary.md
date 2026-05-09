# Wave 12 Summary — Polish & Release

**Canary / RC tag:** `v1.0.0-rc.1`  
**Date:** 2026-05-09  
**Predecessor:** Wave 11 (`v0.14.0-canary.wave11`, 1369 tests)  
**Tests after Wave 12:** 1369 pass, 41 skip, 0 fail

---

## What was delivered

### Task 1 — Doc placeholder audit

All 86 MDX pages were audited. Any page whose body was still the auto-generated
`> **Status:** Placeholder` stub was replaced with real content: usage examples,
API reference tables, and See-also links. NestJS-specific pages that have no direct
Banhmi equivalent (TypeORM, Sequelize, SWC) were rewritten as "recommended
alternatives" redirect pages pointing to Banhmi-native equivalents.

### Task 2 — Example README polish

All eight cluster apps under `examples/` now have a standardised README:

| Example | Description |
|---------|-------------|
| `cats-api` | Classic REST CRUD, demonstrates decorators and DI |
| `cats-mongo` | MongoDB-backed CRUD with `@banhmi/mongo` |
| `drizzle-api` | Drizzle ORM + PostgreSQL (SQLite for local dev) |
| `graphql-demo` | Code-first GraphQL API with `@banhmi/graphql` |
| `microservices-demo` | TCP + Redis microservices cluster |
| `edge-worker` | Cloudflare Workers deployment with `@banhmi/edge` |
| `lambda-app` | AWS Lambda serverless adapter |
| `better-auth-api` | Full auth flow with Better Auth + JWT |
| `scheduling-queues` | Cron, BullMQ, and async event publishing |

Each README follows the format: title, description, prerequisites, `bun run dev`
quickstart, key concepts demonstrated, related docs links.

### Task 3 — Top-level README

`/README.md` replaced with a launch-ready document including:
- Marquee numbers: cold-start 154 ms, RSS 63 MB, ~120 k req/s
- Comparison table vs NestJS@Express, NestJS@Fastify, Hono, Elysia
- Feature highlights (all 9 categories)
- Quickstart (`bun create banhmi my-app`)
- Links to docs site, master spec, roadmap, licence, badges

### Task 4 — Docs landing page

`apps/docs/apps/web/src/routes/index.tsx` rebuilt with:
- Hero section with marquee numbers (154 ms / 63 MB / ~120 k req/s)
- "Get started" + GitHub CTA buttons
- Quickstart code block
- 9-feature grid (HTTP & Routing, Validation, Security, Observability,
  Data, OpenAPI, GraphQL, Microservices, Edge & Serverless)
- Footer with Docs + GitHub links

### Task 5 — Link checker and broken link fixes

`scripts/quality/links.ts` added: scans all 166 MDX files for internal
`[text](/path)` links and validates them against `doc-routes.json`.

41 broken links found and fixed across 27 files. Key mappings applied:

| Broken | Fixed |
|--------|-------|
| `/techniques/drizzle` | `/recipes/drizzle` |
| `/techniques/postgres`, `/techniques/mysql` | `/techniques/database` |
| `/techniques/redis` | `/microservices/redis` |
| `/techniques/static` | `/recipes/serve-static` |
| `/techniques/multipart` | `/techniques/file-upload` |
| `/techniques/edge` | `/deployment/edge` |
| `/techniques/logger` | `/techniques/logging` |
| `/openapi/overview` | `/openapi/introduction` |
| `/migration/nestjs` | `/migration/concepts` |
| `/performance/benchmarks` | `/performance/results` |
| `/interceptors`, `/pipes`, `/exception-filters` | `/overview/…` |
| `/graphql/guards` | `/graphql/plugins` |
| `/microservices/tcp` | `/microservices/overview` |

Link checker exits 0 (clean).

### Task 6 — CHANGELOG.md

`CHANGELOG.md` generated at repo root in keep-a-changelog format.
One section per wave (0–12), documenting packages, features, and changes
shipped across the entire Banhmi Supremacy programme.

### Task 7 — 1.0.0-rc.1 version bump

All 48 public packages and `apps/cli` bumped to `1.0.0-rc.1`.
`workspace:*` references preserved. Lockfile updated. Git tag `v1.0.0-rc.1` created.

Verification before tagging:
```
bun install   → no changes (561 installs)
bun run lint  → 0 errors (after fixing biome.json .claude exclusion +
                applying useLiteralKeys, organizeImports, noUnusedImports)
bun test --recursive → 1369 pass, 41 skip, 0 fail
```

---

## 1.0.0 GA Gate

The tag `v1.0.0-rc.1` starts the **7-day soak window**.

GA (`v1.0.0`) will be cut after the soak window closes **if and only if**:

| Gate condition | Target |
|----------------|--------|
| No `P0` (crash / data-loss) bugs filed | 0 during soak |
| No `P1` (serious regression) bugs filed | 0 during soak |
| CI green on all supported Bun versions (1.1, 1.2, 1.3) | Required |
| `bun test --recursive` 0 failures | Required |
| `bun run quality` scripts all clean | Required |
| Docs site builds (`bun run docs:build`) | Required |
| Benchmark smoke (`bun run benchmarks:smoke`) | Required |

If a `P0` or `P1` bug is found during the soak, a patch release
(`1.0.0-rc.2`) is cut, the soak window resets, and the fix is
backported before GA.

**GA is a manual decision** made by the maintainer after confirming
all gate conditions are met.

---

## Wave programme complete

Waves 0–12 delivered the full Banhmi 1.0 feature set:

| Wave | Theme | Packages |
|------|-------|---------|
| 0 | Foundation | tooling, CI, docs pipeline |
| 1 | HTTP & Validation | 8 packages |
| 2 | Security | 4 packages |
| 3 | Observability | 7 packages |
| 4 | Data | 4 packages |
| 5 | OpenAPI | `@banhmi/openapi` |
| 6 | Patterns | 5 packages |
| 7 | GraphQL | `@banhmi/graphql` |
| 8 | Microservices | `@banhmi/microservices` |
| 9 | Edge & Serverless | 2 packages + hybrid |
| 10 | Migration & Quality | guides, codemods, security audit |
| 11 | Benchmarks | suite, results, methodology |
| 12 | Polish & Release | docs, links, README, CHANGELOG, RC tag |

Total: **48 packages** at `1.0.0-rc.1`.
