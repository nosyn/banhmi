# Wave 2 — Security Summary

**Predecessor:** Wave 1 (HTTP & Validation) — `v0.4.0-canary.wave1`
**Tag:** `v0.5.0-canary.wave2`

## Packages shipped (4)

- `@banhmi/crypto` — Argon2id passwords (Bun.password), AES-256-GCM (WebCrypto), URL-safe random tokens.
- `@banhmi/security` — `HelmetModule`, `CorsModule`, `CsrfModule` (double-submit cookie); `SecurityModule.forRoot` combines all three.
- `@banhmi/throttler` — token-bucket rate limiter, memory + Redis storage, `@Throttle` / `@SkipThrottle` decorators, 429 with rate-limit headers.
- `@banhmi/auth` — `Strategy` base, `LocalStrategy`, `JwtStrategy`, `GoogleStrategy`, `GitHubStrategy`, `BetterAuthStrategy`, `@UseAuth` decorator, `getAuthUser(ctx)` helper.

## Cluster app

`examples/better-auth-api/` wires Helmet + CORS + CSRF, `@Throttle` on auth endpoints, `@banhmi/crypto`'s password hashing on a legacy login demo, and `@UseAuth('jwt')` protecting `GET /api/profile`. Integration test asserts each.

## Tests

848 pass, 0 fail (833 baseline + 15 new from better-auth-api integration).

## Known follow-ups

- Pre-existing 6 `: any` violations in `packages/common/` still untouched.
- `BetterAuthStrategy` does HTTP round-trips today; Wave 6 patterns will tighten direct-client integration.
- NestJS@Fastify upload endpoint stub from Wave 1 unchanged.

## Verification gate

All eight gate commands exited 0 (or `quality:no-anys` flagged only pre-existing violations).

| Command | Result |
|---|---|
| `bun run lint` | clean (fixed import order in `packages/banhmi/src/index.ts`) |
| `bun test --recursive` | 848 pass, 0 fail |
| `bun run docs:build` | success |
| `bun run benchmarks:smoke` | skip (oha not installed) — exit 0 |
| `bun run quality:no-bangs` | clean |
| `bun run quality:no-reflect` | clean |
| `bun run quality:tsdoc` | clean |
| `bun run quality:no-anys` | 6 pre-existing in `packages/common/` — zero new |
