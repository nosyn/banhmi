# Wave 2 — Security Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Each Task is one or two implementer dispatches.

**Goal:** Ship 4 security packages with OWASP top-10 baseline defaults.

**Architecture:** All four packages follow the Wave 1 pattern (`OnApplicationBootstrap` + `HTTP_ADAPTER_TOKEN` for middleware install; method-decorator pattern for route-scoped behaviour like `@Throttle`, `@SkipThrottle`, `@UseAuth`).

**Tech Stack:** Bun, TypeScript ESNext, TC39 Stage 3 decorators, `Symbol.metadata`, Biome 2.4.10, `bun:test`. Bun-native APIs: `Bun.password`, WebCrypto subtle. External deps allowed: none required (auth strategies use the WebCrypto/`fetch` APIs directly).

**Cross-task conventions:** identical to Wave 1 plan. New package skeleton mirrors `packages/static/` / `packages/cookies/`. DO NOT introduce new `: any`/`!`/`reflect-metadata`.

**Order of work:**

1. `@banhmi/crypto` (pure helpers, no DI) — establishes baseline used by other packages.
2. `@banhmi/security` (helmet + cors + csrf in one package, csrf depends on crypto's `randomToken`).
3. `@banhmi/throttler` (rate limiter — uses `@banhmi/redis` for distributed storage subpath).
4. `@banhmi/auth` (strategies — uses `@banhmi/crypto` for password verify, `@banhmi/jwt` for JWT strategy).
5. Cluster-app integration in `examples/better-auth-api/`.
6. Wave verification gate + canary tag.

---

## Task 1: `@banhmi/crypto` — hashing + encryption helpers

Files:

```
packages/crypto/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/password.ts
  src/encryption.ts
  src/random.ts
  test/password.test.ts
  test/encryption.test.ts
  test/random.test.ts

examples/features/crypto/
  {package.json,index.ts,feature.test.ts,README.md}
```

Public API:

```ts
// src/index.ts
export { hashPassword, verifyPassword } from './password'
export { encrypt, decrypt, generateKey } from './encryption'
export { randomBytes, randomToken } from './random'
export type { PasswordOptions, EncryptionResult } from './password'
```

Implementation details:

```ts
// src/password.ts
export type PasswordOptions = {
  /** 'argon2id' (default) or 'argon2i' or 'argon2d'. */
  algorithm?: 'argon2id' | 'argon2i' | 'argon2d'
  /** Memory cost in KiB. Default 19456 (19 MiB). */
  memoryCost?: number
  /** Time cost (iterations). Default 2. */
  timeCost?: number
}

/**
 * Hash a password using Argon2id (Bun.password).
 *
 * @example
 * const hash = await hashPassword('s3cret')
 * const ok = await verifyPassword('s3cret', hash)
 */
export async function hashPassword(plain: string, opts?: PasswordOptions): Promise<string> {
  return Bun.password.hash(plain, {
    algorithm: opts?.algorithm ?? 'argon2id',
    memoryCost: opts?.memoryCost ?? 19456,
    timeCost: opts?.timeCost ?? 2,
  })
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash)
}
```

```ts
// src/encryption.ts (AES-256-GCM via WebCrypto)
export type EncryptionResult = {
  /** base64-url-encoded ciphertext (with auth tag appended) */
  ciphertext: string
  /** base64-url-encoded iv (12 bytes) */
  iv: string
}

export async function generateKey(): Promise<string>      // returns base64-url 32-byte key
export async function encrypt(plaintext: string, keyBase64: string): Promise<EncryptionResult>
export async function decrypt(payload: EncryptionResult, keyBase64: string): Promise<string>
```

```ts
// src/random.ts
export function randomBytes(length: number): Uint8Array      // crypto.getRandomValues
export function randomToken(bytes = 32): string              // base64-url
```

Tests:
- `hashPassword` / `verifyPassword` round-trip; `verifyPassword('wrong', hash)` returns false.
- `encrypt` / `decrypt` round-trip; tampered ciphertext throws.
- `randomBytes(n)` returns `Uint8Array(n)`; calling twice returns different bytes.
- `randomToken()` returns base64-url with no padding; default length 32 bytes (43 chars).
- `generateKey()` returns valid base64-url 32-byte string.

Micro-example: hash a password, verify it; then encrypt & decrypt a string with a generated key.

Doc page: `apps/docs/apps/web/src/content/security/encryption-and-hashing.mdx`.

Re-export from `packages/banhmi`.

Commit: `feat(crypto): add @banhmi/crypto with Argon2id, AES-GCM, secure random`

---

## Task 2: `@banhmi/security` — helmet + CORS + CSRF

Files:

```
packages/security/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/helmet/helmet.module.ts
  src/helmet/headers.ts
  src/cors/cors.module.ts
  src/cors/handle.ts
  src/csrf/csrf.module.ts
  src/csrf/token.ts
  src/security.module.ts            # convenience: combines all three
  src/tokens.ts
  test/helmet.test.ts
  test/cors.test.ts
  test/csrf.test.ts
  test/security.test.ts

examples/features/helmet/{...}
examples/features/cors/{...}
examples/features/csrf/{...}
```

Public API:

```ts
// src/index.ts
export { SecurityModule } from './security.module'
export { HelmetModule } from './helmet/helmet.module'
export { CorsModule } from './cors/cors.module'
export { CsrfModule } from './csrf/csrf.module'
export type { HelmetOptions } from './helmet/helmet.module'
export type { CorsOptions } from './cors/cors.module'
export type { CsrfOptions } from './csrf/csrf.module'
export { HELMET_OPTIONS, CORS_OPTIONS, CSRF_OPTIONS } from './tokens'
```

Helmet headers (defaults):
- `Content-Security-Policy: default-src 'self'`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: ` (empty / minimal)
- `X-Download-Options: noopen`
- `X-DNS-Prefetch-Control: off`

Per-header opts to override individual values; passing `false` for a header omits it.

CORS opts:

```ts
export type CorsOptions = {
  origin?: string | string[] | RegExp | ((origin: string) => boolean)
  credentials?: boolean
  methods?: string[]                      // default GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD
  allowedHeaders?: string[]               // mirror Access-Control-Request-Headers if unset
  exposedHeaders?: string[]
  maxAge?: number                         // seconds, default 5
}
```

CSRF (double-submit cookie):
- On safe methods (GET/HEAD/OPTIONS) issue a `csrf-token` cookie + a paired `_csrf` value embedded in the response (returned via `response.headers.get('x-csrf-token')` for SPA convenience).
- On unsafe methods (POST/PUT/PATCH/DELETE) compare the cookie value with a header value (`x-csrf-token` by default) or form field. Mismatch → 403 with `{ message: 'CSRF token mismatch' }`.
- Use `randomToken()` from `@banhmi/crypto`.

`SecurityModule.forRoot({ helmet?, cors?, csrf? })` registers all three sub-modules at once. Each sub-module remains independently usable.

Tests:
- Helmet: each header is set with the right default; `false` opt omits it; custom value overrides.
- CORS: simple request gets `Access-Control-Allow-Origin`; preflight returns 204 with all allow headers; rejected origin returns no ACAO.
- CSRF: GET issues cookie + token; POST without header → 403; POST with matching header → handler runs.

Three micro-examples (one per sub-module).

Doc pages: `apps/docs/apps/web/src/content/security/{helmet,cors,csrf}.mdx`.

Re-export from `packages/banhmi`.

Commit: `feat(security): add @banhmi/security with helmet, CORS, CSRF modules`

---

## Task 3: `@banhmi/throttler` — rate limiter

Files:

```
packages/throttler/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/throttler.module.ts
  src/decorators.ts                  # @Throttle, @SkipThrottle
  src/throttler.middleware.ts
  src/storage/memory.ts
  src/storage/redis.ts
  src/types.ts
  src/tokens.ts
  test/memory-storage.test.ts
  test/throttler.test.ts

examples/features/rate-limiting/{...}
```

Public API:

```ts
export { ThrottlerModule } from './throttler.module'
export { Throttle, SkipThrottle } from './decorators'
export { MemoryThrottlerStorage } from './storage/memory'
export type { ThrottlerOptions, ThrottlerStorage, ThrottleConfig } from './types'
export { THROTTLER_OPTIONS } from './tokens'
// RedisThrottlerStorage exported via subpath `@banhmi/throttler/redis`
```

```ts
export type ThrottleConfig = { ttl: number; limit: number }
export type ThrottlerOptions = ThrottleConfig & { storage?: ThrottlerStorage; keyGenerator?: (req: Request) => string }
export interface ThrottlerStorage {
  increment(key: string, ttlMs: number): Promise<{ count: number; resetAt: number }>
}
```

`@Throttle({ ttl, limit })` overrides the module default for the handler.
`@SkipThrottle()` exempts the handler entirely.

Default key generator: client IP from `X-Forwarded-For` or the connection remote (handle `Bun.serve`'s `request.headers.get('x-forwarded-for')` or fallback).

Returns 429 with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers.

Tests:
- Memory storage: increments correctly within window, resets after TTL.
- Throttler middleware: under limit → handler runs; at limit → 429 with proper headers.
- `@SkipThrottle()` exempts a handler.
- `@Throttle({ ... })` overrides default.

Micro-example: `GET /` rate-limited at 5/sec.

Doc page: `apps/docs/apps/web/src/content/security/rate-limiting.mdx`.

Re-export.

Commit: `feat(throttler): add @banhmi/throttler with token-bucket rate limiting`

---

## Task 4: `@banhmi/auth` — strategy-based authentication

Files:

```
packages/auth/
  package.json
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/auth.module.ts
  src/strategy.ts                # base Strategy abstract class
  src/strategies/local.ts
  src/strategies/jwt.ts
  src/strategies/google.ts       # OAuth 2.0
  src/strategies/github.ts       # OAuth 2.0
  src/strategies/better-auth.ts
  src/decorators.ts              # @UseAuth, @AuthUser
  src/tokens.ts
  test/local.test.ts
  test/jwt.test.ts
  test/google.test.ts
  test/auth-decorator.test.ts

examples/features/auth-local/{...}
examples/features/auth-jwt/{...}
```

Public API:

```ts
export { AuthModule } from './auth.module'
export { Strategy } from './strategy'
export { LocalStrategy } from './strategies/local'
export { JwtStrategy } from './strategies/jwt'
export { GoogleStrategy } from './strategies/google'
export { GitHubStrategy } from './strategies/github'
export { BetterAuthStrategy } from './strategies/better-auth'
export { UseAuth, AuthUser } from './decorators'
export type { AuthOptions, StrategyName, AuthenticatedRequest } from './types'
```

Strategy contract:

```ts
export abstract class Strategy<TUser = unknown> {
  abstract name: string
  abstract authenticate(req: Request, ctx: RouteCtx): Promise<TUser | null>
}
```

`@UseAuth('local')` decorator wraps a handler to require authentication via the named strategy. On success, `ctx.state.user = TUser`. On failure → 401.

`@AuthUser()` decorator (method-decorator pattern matching Wave 1's `@SignedCookie`) extracts `ctx.state.user` and passes it to the handler.

Strategies:

- `LocalStrategy({ usernameField = 'username', passwordField = 'password', validate(creds) → user | null })` — reads JSON body or form.
- `JwtStrategy({ secret, extract = bearerToken })` — uses `@banhmi/jwt` to verify; returns the payload.
- `GoogleStrategy` / `GitHubStrategy` — OAuth 2.0 flow:
  - `/auth/<provider>` redirects to provider's auth URL.
  - `/auth/<provider>/callback` exchanges code for tokens, fetches user info, calls `validate(profile)` user-supplied callback.
  - State parameter signed via `@banhmi/crypto`'s `signValue` (or `randomToken`).
- `BetterAuthStrategy({ url })` — calls a better-auth instance's session-validation endpoint.

`AuthModule.register({ strategies: Strategy[] })` registers all strategies in DI by name.

Tests:
- LocalStrategy: validate callback returns user → 200; returns null → 401.
- JwtStrategy: valid token in `Authorization: Bearer <jwt>` → 200; expired → 401; missing → 401.
- GoogleStrategy: code → token → user flow with mocked HTTP responses.
- `@AuthUser()` decorator returns the right principal shape.
- `@UseAuth` rejects requests without authentication.

Two micro-examples (local + jwt).

Doc pages: `apps/docs/apps/web/src/content/security/{authentication,authorization}.mdx`.

Re-export.

Commit: `feat(auth): add @banhmi/auth with local/jwt/oauth/better-auth strategies`

---

## Task 5: Wire `examples/better-auth-api/`

- Add helmet + CORS + CSRF middleware.
- Add `@Throttle({ ttl: 60000, limit: 30 })` on the auth routes.
- Replace any inline password hashing with `@banhmi/crypto`'s `hashPassword`/`verifyPassword`.
- Demonstrate `@UseAuth('jwt')` on a protected resource alongside the existing better-auth flow.

Add `examples/better-auth-api/test/integration.test.ts` (or extend existing tests) covering each integration.

Commit: `feat(better-auth-api): wire wave-2 packages into auth cluster app`

---

## Task 6: Wave 2 verification gate + canary tag

Same shape as Wave 1's gate. Run each gate command, confirm green, write summary doc at `docs/superpowers/specs/2026-05-09-wave-2-summary.md`, tag `v0.5.0-canary.wave2`. Run `security-review` skill on the wave's diff if available; capture findings (no high-severity).

End-of-wave commit: `docs(wave-2): add summary`.

---

## Self-Review

| Master spec wave-2 deliverable | Task in this plan |
|---|---|
| security (helmet + cors + csrf) | Task 2 |
| throttler | Task 3 |
| crypto | Task 1 |
| auth | Task 4 |
| cluster-app integration | Task 5 |
| verification gate | Task 6 |

No placeholders. Each Task has concrete public API surface, concrete tests, concrete acceptance.
