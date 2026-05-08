# Wave 9 — Edge & Serverless Implementation Plan

**Predecessor:** Wave 8 (Microservices) — `v0.11.0-canary.wave8`, 1305 tests.
**Goal:** Two new packages (`@banhmi/edge`, `@banhmi/serverless`) plus a polish pass on deployment-time features (HTTPS, hybrid, raw body, keep-alive, hot reload, request lifecycle).

## Tasks

1. `@banhmi/edge` — adapter for Cloudflare Workers / Vercel Edge / Deno Deploy. Ships a `createEdgeHandler(AppModule): (req: Request) => Promise<Response>` that runs the Banhmi app inside an edge runtime without `Bun.serve`. Uses the WinterCG-compatible request/response types.

2. `@banhmi/serverless` — adapter for AWS Lambda / Vercel functions. `createLambdaHandler(AppModule)` returns a `(event, context) => Promise<APIGatewayProxyResult>` handler that translates between API Gateway v1/v2 events and the framework's request shape.

3. Hybrid app — let one process expose both an HTTP server and a microservice listener. Add `BanhmiApplication.connectMicroservice(opts)` and `app.startAllMicroservices()` API.

4. HTTPS support — `BanhmiFactory.create(AppModule, { https: { key, cert } })` opens an HTTPS-only server (via `Bun.serve({ tls })`). Multiple servers via `app.connect({ port, tls })` for separate HTTP+HTTPS listeners.

5. Raw body — `app.useGlobalPipes(new RawBodyParserPipe())`-style support; expose `request.rawBody: Uint8Array` on the route ctx when configured.

6. Keep-Alive connection knob — Bun's `Bun.serve` defaults are fine; expose timeout/maxRequestsPerSocket via factory options.

7. Hot reload — document the existing `bun --watch` workflow + a `BanhmiHmrModule` that invalidates singletons on file change in dev mode (best-effort).

8. Request lifecycle doc — flesh out the placeholder MDX with a diagram of pipeline stages.

9. Cluster apps: `examples/edge-worker/` and `examples/lambda-app/`.

10. Verification gate + canary `v0.12.0-canary.wave9`.

## Pragmatic budgets

- Tier A: edge adapter, serverless adapter, hybrid, raw body, keep-alive, request-lifecycle docs.
- Tier B: HTTPS (likely simple), hot reload (documentation).

If Cloudflare Workers / Vercel Edge runtime simulation is hard to test, mock a `Request` and assert the adapter produces the expected `Response`. Don't try to actually deploy.

## Files

```
packages/edge/
  package.json
  src/index.ts
  src/edge-adapter.ts
  src/types.ts
  test/edge-adapter.test.ts

packages/serverless/
  package.json
  src/index.ts
  src/lambda-adapter.ts
  src/api-gateway-v1.ts
  src/api-gateway-v2.ts
  src/types.ts
  test/lambda-adapter.test.ts

examples/edge-worker/
  package.json
  src/index.ts                # exports the worker fetch handler
  README.md
  test/integration.test.ts

examples/lambda-app/
  package.json
  src/index.ts                # exports the lambda handler
  README.md
  test/integration.test.ts
```

Hybrid + HTTPS + raw body live in `packages/core/` and `packages/platform-bun/` polish (no new packages).

## Doc pages

Replace placeholders at:
- `apps/docs/apps/web/src/content/deployment/{standalone-apps,https-and-multiple-servers,hybrid,edge,hot-reload,raw-body,keep-alive,request-lifecycle,common-errors}.mdx`.
- FAQ entries under `apps/docs/apps/web/src/content/faq/{serverless,http-adapter,keep-alive,global-path-prefix,raw-body,hybrid-application,https-and-multiple-servers,request-lifecycle,common-errors,examples}.mdx`.

## Verification gate

Standard. Tag `v0.12.0-canary.wave9`. Summary at `docs/superpowers/specs/2026-05-09-wave-9-summary.md`.
