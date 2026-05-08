# cookies example

Demonstrates `@banhmi/cookies`: a signed cookie round-trip.

- `GET /set` — signs `'demo-user'` with HMAC-SHA256 and returns a `Set-Cookie` header.
- `GET /me` — reads and verifies the signed cookie via `@SignedCookie`, returning the plain value.

## Run

```bash
bun test feature.test.ts
```
