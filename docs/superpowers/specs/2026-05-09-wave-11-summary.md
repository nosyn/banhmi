# Wave 11 Summary — Benchmarks

**Canary tag:** `v0.14.0-canary.wave11`  
**Date:** 2026-05-09  
**Predecessor:** Wave 10 (`v0.13.0-canary.wave10`, 1368 tests)  
**Tests after Wave 11:** 1369 pass, 41 skip, 0 fail

---

## What was delivered

### Task 1 — Hono + Elysia competitors

- `benchmarks/competitors/hono/` — Hono 4.x with Bun adapter + `@hono/zod-validator`
- `benchmarks/competitors/elysia/` — Elysia 1.x with built-in TypeBox validator
- Both expose `GET /`, `POST /json`, `POST /validate`, `POST /upload`
- Both verified to boot under `bun run start` (ports 3004, 3005)

### Task 2 — Scenarios

Eight scenario modules in `benchmarks/scenarios/`:

| Scenario | Status |
|---|---|
| `hello` | Harness ready — awaiting oha |
| `json-roundtrip` | Harness ready — awaiting oha |
| `validation` | Harness ready — awaiting oha |
| `cold-start` | **Real numbers captured** |
| `rss-idle` | **Real numbers captured** |
| `file-upload` | Scaffolded — Wave 12 |
| `ws-throughput` | Scaffolded — Wave 12 |
| `db-cats` | Scaffolded — Wave 12 |

### Task 3 — Runner improvements

- `oha.ts`: added `p99_9` field; parses `p999` from oha ≥ 1.4, falls back to p99
- `bombardier.ts`: full wrapper with `{rps, p50, p95, p99, p99_9, totalSeconds}`
- `autocannon.ts`: full wrapper using `--json` flag, maps `p97_5 → p95`
- `cold-start.ts`: spawns competitor, polls `GET /` until first 200, returns `startupMs`
- `rss.ts`: spawns competitor, idles, snapshots RSS via `ps -o rss=` + `lsof` PID resolution

### Task 4 — Orchestration + results

- `benchmarks/run.ts`: iterates (competitor × scenario), boots, runs, writes JSON, kills
- `BENCH_SCENARIOS`, `BENCH_TARGETS`, `BENCH_SECONDS`, `BENCH_DATE` env overrides
- 40 JSON result files written to `benchmarks/results/2026-05-09/`
- `bench:run` script added to root `package.json`

**Real numbers (2026-05-09, macOS 25, Bun 1.3.13):**

Cold-start (ms): elysia=2, hono=104, banhmi=154, nestjs-fastify=307, nestjs-express=309

RSS idle (kB): hono=42992, banhmi=63488, elysia=78272, nestjs-express=83424, nestjs-fastify=83584

HTTP load tests (hello, json-roundtrip, validation): **placeholders** — oha not installed in this environment. Install oha and run `bun run bench:run` for real numbers.

### Task 5 — Docs

- `methodology.mdx`: hardware, warmup (3 s / 10 s windows), oha primary + alternatives,
  scenario table, competitor ports, 5 fairness rules, reproduction instructions — **FILLED**
- `results.mdx`: real cold-start + rss-idle tables; HTTP load tables as `_pending_`;
  Wave 12 scaffolded scenario table — **FILLED (partial)**
- `tuning.mdx`: per-framework checklist (Banhmi, Hono, Elysia, NestJS@Fastify,
  NestJS@Express) + OS-level and benchmark-specific notes — **FILLED**

### Task 6 — CI

- `.github/workflows/bench.yml`: nightly at 06:00 UTC + `workflow_dispatch`
- Installs oha from GitHub releases (linux-amd64)
- Runs `bun run bench:run` with `BENCH_SECONDS=15`
- Uploads `benchmarks/results/` as artifact retained 90 days

### Task 7 — Verification gate

```
bun run lint    → 0 errors, 0 warnings, 10 infos (pre-existing)
bun run quality → no-anys CLEAN, no-bangs CLEAN, no-reflect CLEAN, tsdoc CLEAN
bun test --recursive → 1369 pass, 41 skip, 0 fail
```

---

## Pending (Wave 12)

- HTTP load test numbers (hello, json-roundtrip, validation) — need oha on CI or local
- `file-upload` scenario — needs custom fetch-based micro-bench (oha can't send multipart)
- `ws-throughput` — needs `/ws` endpoints in each competitor
- `db-cats` — needs `/cats` CRUD endpoints + in-memory SQLite in each competitor
- `results.mdx` HTTP load tables remain `_pending_` until Wave 12 run
