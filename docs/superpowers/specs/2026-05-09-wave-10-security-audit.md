# Wave 10 Security Audit

**Date:** 2026-05-09
**Auditor:** Wave 10 automated review
**Scope:** Security-relevant packages — `@banhmi/auth`, `@banhmi/security`, `@banhmi/crypto`, `@banhmi/cookies`, `@banhmi/session`, `@banhmi/jwt`
**Baseline commit:** `3eaa5a9` (post–Wave 10 Task 3)

---

## Summary

| Severity | Count | Status |
|---|---|---|
| High | 1 | Fixed in this wave (Task 5) |
| Medium | 3 | Filed as follow-ups |
| Low | 4 | Logged, no action required now |

---

## Findings

### H-1 — JWT `verify` does not pin the algorithm (HIGH) — FIXED

**File:** `packages/jwt/src/jwt.service.ts:30`

**Description:**
`jwtVerify` from `jose` is called without an `algorithms` constraint:

```ts
// Before fix
const { payload } = await jwtVerify(token, this.secretKey, {
  issuer: this.options.issuer,
  audience: this.options.audience,
})
```

Without `algorithms`, an attacker can craft a token using `alg: "none"` and bypass signature verification on some `jose` versions, or confuse HS256 with RS256 by supplying a public key as the HMAC secret. The sign path hardcodes `HS256` but verify does not enforce it.

**Fix applied:** Pass `algorithms: ['HS256']` (or the configured algorithm) to `jwtVerify`. See commit in this wave.

**Fixed diff:**
```ts
const { payload } = await jwtVerify(token, this.secretKey, {
  algorithms: [this.options.algorithm ?? 'HS256'],
  issuer: this.options.issuer,
  audience: this.options.audience,
})
```

---

### M-1 — CSRF cookie defaults `secure: false` (MEDIUM) — Follow-up

**File:** `packages/security/src/csrf/csrf.middleware.ts:84`

**Description:**
The CSRF cookie is set with `secure: false` by default:

```ts
secure: cookieOpts.secure ?? false,
```

In production, this allows the CSRF token to be transmitted over plain HTTP, making it accessible to network attackers (MITM on non-TLS connections). The `httpOnly: false` default is intentional (SPAs need JS access), but `secure` should default to `true` so the cookie is only sent over HTTPS.

**Recommendation:** Change default to `secure: true` and document that the option should be explicitly set to `false` only in local development.

**Action:** Filed as follow-up issue `wave-10-csrf-secure-default`.

---

### M-2 — Session cookie defaults `secure: false` (MEDIUM) — Follow-up

**File:** `packages/session/src/session.middleware.ts:38`

**Description:**
Same issue as M-1 — session ID cookie is created with `secure: false` by default:

```ts
const secure = opts.cookie?.secure ?? false
```

Session cookies transmitted over HTTP expose the session ID to network interception.

**Recommendation:** Default to `true`; require explicit opt-out for development.

**Action:** Filed as follow-up issue `wave-10-session-secure-default`.

---

### M-3 — `JwtModuleOptions` does not expose `algorithm` option (MEDIUM) — Follow-up

**File:** `packages/jwt/src/tokens.ts`

**Description:**
`JwtModuleOptions` only exposes `secret`, `expiresIn`, `issuer`, `audience`. There is no `algorithm` field, so callers cannot configure RS256/ES256 (asymmetric keys) or change the algorithm from HS256. Hardcoding the algorithm is acceptable for symmetric secrets but blocks asymmetric key workflows.

**Recommendation:** Add `algorithm?: string` (with a sensible HS256 default) to `JwtModuleOptions`.

**Action:** Filed as follow-up.

---

### L-1 — `toBase64Url` in `random.ts` spreads large byte arrays (LOW)

**File:** `packages/crypto/src/random.ts:11`

**Description:**
`btoa(String.fromCharCode(...bytes))` uses spread (`...bytes`) to convert a `Uint8Array` to a string. For large byte arrays this will hit the V8 stack size limit. In practice CSRF tokens (32 bytes) and AES-GCM keys (32 bytes) are small, so this is not a current risk.

**Recommendation:** Use a loop-based conversion (like `encryption.ts` already does) to be safe for future callers.

**Action:** Logged; no urgent fix.

---

### L-2 — CORS `resolveOrigin` allows `*` when `opts.origin` is undefined (LOW)

**File:** `packages/security/src/cors/handle.ts:23`

**Description:**
```ts
if (allowed === undefined || allowed === '*') {
  return '*'
}
```

If `CorsModule.forRoot()` is called without specifying `origin`, the default is `*`, which is permissive. This is documented behavior but could bite users who omit the option thinking it defaults to a restrictive policy.

**Recommendation:** Emit a `console.warn` in development mode when `origin` is `*` or undefined.

**Action:** Logged.

---

### L-3 — No max-age enforcement on session store memory implementation (LOW)

**File:** `packages/session/src/stores/memory.ts`

**Description:**
The in-memory session store is intended only for development, but if used in production the TTL passed at `store.set(id, data, ttl)` may not be enforced correctly under high load or after process restart. Sessions would be retained in memory indefinitely.

**Recommendation:** Add a clear warning comment that the memory store is not suitable for production and that a Redis or database-backed store must be configured.

**Action:** Logged.

---

### L-4 — `X-Frame-Options: SAMEORIGIN` vs. CSP `frame-ancestors` (LOW)

**File:** `packages/security/src/helmet/headers.ts:15`

**Description:**
The default Helmet config sets `X-Frame-Options: SAMEORIGIN`. Modern browsers prefer `Content-Security-Policy: frame-ancestors 'self'`, which supersedes `X-Frame-Options`. Both are set, which is fine, but the CSP default (`default-src 'self'`) does not include `frame-ancestors`, meaning CSP does not actually restrict framing.

**Recommendation:** Add `frame-ancestors 'self'` to the default CSP string in a future wave.

**Action:** Logged.

---

## Fix applied in this wave: H-1

The H-1 fix (pinning the algorithm in `jwtVerify`) was applied immediately in Task 5. See the commit `fix(jwt): pin algorithm in jwtVerify to prevent alg confusion` in this wave.

---

## Follow-up issues created

- `wave-10-csrf-secure-default` — M-1
- `wave-10-session-secure-default` — M-2
- `wave-10-jwt-algorithm-option` — M-3
