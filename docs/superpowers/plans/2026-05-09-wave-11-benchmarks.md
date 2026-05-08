# Wave 11 — Benchmarks Implementation Plan

**Predecessor:** Wave 10 (Migration & Quality) — `v0.13.0-canary.wave10`, 1368 tests.
**Goal:** Comprehensive comparative benchmark suite vs NestJS@Express, NestJS@Fastify, Hono, Elysia. Live results published to docs site.

## Tasks

1. **Add Hono + Elysia competitors** at `benchmarks/competitors/{hono,elysia}/`. Each has the same endpoints as the existing competitors (`/`, `/json`, `/validate`, `/upload`).

2. **Expand scenarios** under `benchmarks/scenarios/`:
   - `hello/` — `GET /`
   - `json-roundtrip/` — `POST /json` echoing 1 KB body
   - `validation/` — `POST /validate` 10-field DTO with Zod (or each framework's idiomatic validator)
   - `file-upload/` — `POST /upload` 5 MB multipart
   - `ws-throughput/` — 1000 concurrent WS clients receiving 100 msg/s each
   - `db-cats/` — CRUD against in-memory SQLite (each framework's idiomatic DB call)
   - `cold-start/` — process spawn → first 200 measured
   - `rss-idle/` — spawn → idle 30 s → measure RSS

3. **Improve `benchmarks/runners/`**:
   - `oha.ts` — already exists; ensure it captures p50/p95/p99/p99.9.
   - `bombardier.ts` — wrap bombardier (alternative runner).
   - `autocannon.ts` — wrap autocannon (Node-native alt).
   - `cold-start.ts` — measure spawn → first response.
   - `rss.ts` — process spawn → snapshot RSS over time.

4. **Run all scenarios on all 5 competitors**, write JSON outputs to `benchmarks/results/2026-05-09/`.

5. **Render results into the docs site** at `apps/docs/apps/web/src/content/performance/results.mdx`. Use a simple table; show wins prominently.

6. **CI integration**: add a nightly GitHub Actions workflow that runs `benchmarks:full`, archives the JSON, and (optionally) commits a snapshot to `benchmarks/results/<date>/`.

7. **Verification gate** + canary tag `v0.14.0-canary.wave11`.

## Pragmatic note

Real benchmarks need `oha` installed and a quiet machine. The agent's environment may not have `oha` or may produce noisy numbers. Acceptable approach:
- Add the harness, scenarios, and competitors.
- Run a smoke pass to validate the harness end-to-end.
- Publish results-format MDX with placeholder values (or whatever was actually measured).
- Document how to run a real benchmark.

The hard targets in the master spec (≥ 2× NestJS@Fastify hello, etc.) are aspirational; the real numbers will be captured later. This wave's job is to make the harness production-grade.

## Files

- `benchmarks/competitors/hono/{...}`
- `benchmarks/competitors/elysia/{...}`
- `benchmarks/scenarios/<name>/...` per scenario
- `benchmarks/runners/{bombardier,autocannon,cold-start,rss}.ts`
- `benchmarks/results/<date>/<scenario>-<competitor>.json`
- `apps/docs/apps/web/src/content/performance/{methodology,results,tuning}.mdx`
- `.github/workflows/bench.yml` (nightly)

## Order

1 → 7 sequentially. Commit per task.
