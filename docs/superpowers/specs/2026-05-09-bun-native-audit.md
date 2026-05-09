# Bun-Native Dependency Audit

**Date:** 2026-05-09
**Scope:** All `packages/*/package.json` runtime dependencies
**Goal:** Eliminate external packages wherever a Bun built-in covers the same need

---

## Summary

| Package | External dep removed | Replaced with | Status |
|---------|----------------------|---------------|--------|
| `@banhmi/redis` | `ioredis ^5.10.1` | `Bun.RedisClient` adapter | Done |
| `@banhmi/queue` | `ioredis ^5.10.1` | `RedisLike` from `@banhmi/redis` | Done |
| `@banhmi/throttler` | ioredis type import | `RedisLike` from `@banhmi/redis` | Done |
| `@banhmi/microservices` | `ioredis` (peer) | Retained — see below | Intentional |
| `@banhmi/cache` | n/a | Already using `RedisLike` | No change needed |
| `@banhmi/session` | n/a | Stale comment updated | Minor cleanup |

---

## Decisions

### ioredis → Bun.RedisClient (`@banhmi/redis`)

`Bun.RedisClient` (available as `import { redis } from 'bun'`) replaces
ioredis for all single-connection use cases.  A thin adapter wraps the
native client and implements the new `RedisLike` interface, which is the
contract all other framework packages depend on.

**Adapter design decisions:**

| Operation | Reason for adapter logic |
|-----------|--------------------------|
| `set(key, value, ttlSeconds?)` | Bun signature: `set(k, v, 'EX', n)` — adapter normalises to optional `ttlSeconds` |
| `pexpire(key, ms, 'NX'?)` | bun-types 1.3.x lacks NX flag; uses `client.send('PEXPIRE', [k, ms, 'NX'])` raw command |
| `hgetall(key)` | Bun returns `{}` for missing keys (ioredis returned `null`); return type is `Record<string,string>` |
| `zadd(key, score, member)` | Bun's variadic form needs `String(score)` |
| `subscribe(channel, cb)` | Bun uses callbacks, not event emitter |
| `close()` | Bun calls it `close()`; ioredis used `quit()` |

### ioredis retained (`@banhmi/microservices`)

The `RedisTransport` uses `psubscribe` (glob-pattern channel subscription)
plus the `on('pmessage', ...)` event emitter.  `Bun.RedisClient.subscribe`
only accepts exact channels via a callback.  There is no native
pattern-subscribe in Bun 1.3.x.  `ioredis` remains an optional peer dep
for this transport; this can be revisited when Bun adds `psubscribe`.

---

## RedisLike Interface

Defined in `packages/redis/src/types.ts`.  All framework packages that
previously imported the ioredis `Redis` type now import `RedisLike`
instead.  This enables:

1. Zero-dependency unit test fakes (plain objects satisfying the interface)
2. Future swap of the underlying Redis client without changing any
   consumer code
3. Deterministic in-memory mocks in integration tests when real Redis is
   unavailable

---

## Already Bun-Native (no change needed)

| Feature | Bun built-in used | Package |
|---------|-------------------|---------|
| HTTP server | `Bun.serve` | `@banhmi/platform-bun` |
| SQLite | `bun:sqlite` | `@banhmi/typeorm` |
| PostgreSQL | `Bun.sql` | `@banhmi/typeorm` |
| S3 | `Bun.S3Client` | `@banhmi/storage` |
| Compression | `Bun.gzipSync` / `Bun.gunzipSync` | `@banhmi/common` |
| Static files | `Bun.file()` | `@banhmi/platform-bun` |
| Password hashing | `Bun.password` | `@banhmi/auth` |
| WebSockets | `Bun.serve` WS upgrade | `@banhmi/websockets` |
| Multipart | `Bun.FormData` | `@banhmi/common` |
| Cookies | `bun` cookie helpers | `@banhmi/session` |
| Crypto | `Bun.hash` / Web Crypto | `@banhmi/auth` |
| MySQL | `bun-mysql` (peer) | `@banhmi/typeorm` |

---

## Test Impact

All 1369 tests continued to pass throughout the migration (41 skipped —
all require a live Redis or database instance).  No test behaviour was
changed; only the type of the mock objects was tightened to `RedisLike`.
