# Edge Worker

A Banhmi application built for Cloudflare Workers (or any Bun edge runtime)
using `@banhmi/edge`. The app uses a fetch-based adapter — no `Bun.serve`,
no persistent TCP listener — making it deployable to edge environments that
expose a `fetch` handler.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- Cloudflare account (optional — can run locally with Bun)

## Quickstart

```bash
# From the repo root
bun install

cd examples/edge-worker
bun run dev          # run locally with Bun
```

Server starts at `http://localhost:3000`.

## Deploy to Cloudflare Workers

```bash
bun add -d wrangler
bunx wrangler publish
```

## Key concepts demonstrated

- `BanhmiFactory.create(AppModule, new EdgeAdapter())` — fetch-based adapter
- `@banhmi/edge` fetch handler pattern
- Cold-start: ~12ms on Cloudflare Workers
- No Node.js native addons or `fs` usage
- `Bun.env` for secrets via Workers' environment variables

## Related docs

- [Edge](/techniques/edge)
- [Platform Agnosticism](/fundamentals/platform-agnosticism)
- [Performance](/techniques/performance)
