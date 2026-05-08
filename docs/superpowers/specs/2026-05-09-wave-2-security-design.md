# Wave 2 — Security Design Specification

**Date:** 2026-05-09
**Status:** Approved (per master spec; user autonomy directive)
**Predecessor:** Wave 1 (`v0.4.0-canary.wave1`)
**Successor:** Wave 3 (observability)

## 1. Scope

Ship 4 new packages closing the security gap vs NestJS, with OWASP top-10 baseline defaults:

| # | Package | Replaces / parallels |
|---|---|---|
| 1 | `@banhmi/security` | `helmet` + `cors` + `csurf` middleware bundles |
| 2 | `@banhmi/throttler` | `@nestjs/throttler` |
| 3 | `@banhmi/crypto` | `bcrypt` / `argon2` / `aes-256-gcm` via Bun.password + WebCrypto |
| 4 | `@banhmi/auth` | `@nestjs/passport` strategies + `better-auth` bridge |

## 2. Cross-cutting design decisions

### 2.1 `@banhmi/security` — modular middleware bundle

Three sub-modules combined into a single package, each independently usable:

- `HelmetModule.forRoot(opts?)` — sets security response headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. Sensible defaults match modern OWASP guidance.
- `CorsModule.forRoot(opts?)` — Access-Control-Allow-* headers. Supports allowlist origins, credentials, exposed headers, max-age, preflight handling.
- `CsrfModule.forRoot(opts?)` — double-submit cookie strategy. Issues a token, validates on state-changing requests.

Each registers via the `OnApplicationBootstrap` + `HTTP_ADAPTER_TOKEN` middleware pattern established in Wave 1.

### 2.2 `@banhmi/throttler` — token bucket rate limiter

`ThrottlerModule.forRoot({ ttl: 60_000, limit: 100, storage?: 'memory' | RedisStorage })`. Per-handler override via `@Throttle({ ttl, limit })`. `@SkipThrottle()` exempts a handler. Storage abstracted; memory by default, Redis via `@banhmi/throttler/redis` subpath.

Returns `429 Too Many Requests` with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers.

### 2.3 `@banhmi/crypto` — hashing + encryption

Pure helper functions, no DI or module integration. Three areas:

- **Password hashing**: `hashPassword(plain, opts?)` / `verifyPassword(plain, hash)` — Argon2id by default via `Bun.password.hash`/`verify`, `algorithm: 'argon2id'`. Fallback to scrypt when bun's argon2 isn't available.
- **Symmetric encryption**: `encrypt(plain, key)` / `decrypt(ct, key)` — AES-256-GCM via WebCrypto. Returns `iv:ct:tag` base64-url tuple.
- **Random**: `randomBytes(n)`, `randomToken(bytes = 32)` — base64-url encoded token suitable for CSRF / API keys.

### 2.4 `@banhmi/auth` — strategy-based authentication

`AuthModule.register({ strategies: [...] })` registers strategies. Built-in:

- `LocalStrategy({ usernameField, passwordField, validate })` — validates form/JSON credentials.
- `JwtStrategy({ secret, extract })` — verifies a JWT (depends on existing `@banhmi/jwt`).
- `GoogleStrategy({ clientId, clientSecret, callbackURL })` — OAuth 2.0 flow.
- `GitHubStrategy({ clientId, clientSecret, callbackURL })` — OAuth 2.0 flow.
- `BetterAuthStrategy({ url })` — bridge to a `better-auth` instance (uses the existing `examples/better-auth-api/` pattern).

`@UseAuth('local')` decorator (and `@UseAuth('jwt')` etc.) mounts a strategy as a guard. `@AuthUser()` parameter-style decorator surfaces the authenticated principal (using the method-decorator pattern established in Wave 1).

Strategies are registered in DI; users implement `validate(payload)` callbacks.

## 3. Acceptance criteria (per package)

Same as Wave 1: ≥ 90% line coverage, TSDoc on every public symbol with `@example`, micro-example with passing test, doc page MDX replaces placeholder, package re-exported from `packages/banhmi`, all `quality:no-bangs`/`no-reflect`/`tsdoc` clean.

## 4. Cluster-app integration

`examples/better-auth-api/` (existing auth demo) gets wired with:
- Helmet + CORS + CSRF via `@banhmi/security`.
- Rate limit on `/api/*` via `@banhmi/throttler`.
- Password hashing on signup via `@banhmi/crypto`.
- JWT or Local strategy via `@banhmi/auth` (in addition to better-auth).

The cluster app's existing tests stay green plus new tests cover each integration.

## 5. Verification gate

Same shape as Wave 1. End of wave runs `security-review` skill on the wave diff (no high-severity findings). Tag canary `v0.5.0-canary.wave2`.

## 6. Risks

| Risk | Mitigation |
|---|---|
| CSRF double-submit cookie complexity | Stay with double-submit; deferred to Wave 10 if synchronizer-token requested |
| OAuth strategies need real callback URLs to test | Test the strategy state machine in unit tests; integration uses a mock OAuth provider |
| Better-auth bridge couples to its API surface | Pin to a peer-dep version; bridge re-renders user → principal shape |
| Throttler memory storage doesn't survive restarts | Documented; Redis storage is the production recommendation |

## 7. Out of scope

- Synchronizer-token CSRF (vs double-submit) — deferred to Wave 10 if security audit flags it.
- WebAuthn / passkeys — separate wave (Wave 10 patterns).
- mTLS — Wave 9 deployment.
