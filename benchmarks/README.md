# Banhmi Benchmarks

Comparative benchmarks vs NestJS@Express, NestJS@Fastify, and (later) Hono / Elysia.

- `runners/` — wrappers around `oha`, `bombardier`, `autocannon`.
- `scenarios/` — workload definitions (hello, json-roundtrip, validation, etc.).
- `competitors/` — sibling apps for each framework (`banhmi`, `nestjs-express`, `nestjs-fastify`, …).
- `results/` — JSON outputs of past runs.
- `bun run smoke` — end-to-end sanity check.
