# Better Auth API

A Banhmi HTTP API demonstrating [Better Auth](https://better-auth.com)
email/password authentication backed by `bun:sqlite`. Covers sign-up,
sign-in, session-cookie-based auth, and protecting routes with an
`AuthGuard` — all without Passport.js or JWT library dependencies.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- No external services required (`bun:sqlite` is built-in)

## Quickstart

```bash
# From the repo root
bun install

export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
export BETTER_AUTH_URL="http://localhost:3001"

cd examples/better-auth-api
bunx --bun auth@latest migrate   # create SQLite tables
bun run dev
```

Server starts at `http://localhost:3001`.

## Key concepts demonstrated

- Better Auth mounted as banhmi middleware — all `/api/auth/**` requests are forwarded to `auth.handler`
- `AuthGuard` using `auth.api.getSession` to protect individual routes
- Public vs protected endpoints on the same controller
- Zero-config SQLite database via `bun:sqlite`


## Endpoints

| Method | Path | Auth required |
|--------|------|---------------|
| POST | `/api/auth/sign-up/email` | No |
| POST | `/api/auth/sign-in/email` | No |
| GET | `/users/ping` | No |
| GET | `/users/me` | Yes (session cookie) |

## Try it

```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password1234","name":"Alice"}' \
  -c /tmp/cookies.txt

# Sign in (saves session cookie)
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password1234"}' \
  -c /tmp/cookies.txt -b /tmp/cookies.txt

# Protected route — returns session user
curl http://localhost:3001/users/me -b /tmp/cookies.txt

# Protected route without cookie — 401
curl http://localhost:3001/users/me

# Public route — always 200
curl http://localhost:3001/users/ping
```

## Related docs

- [Authentication](/security/authentication)
- [Guards](/overview/guards)
- [bun:sqlite](/bun-native/bun-sqlite)
- [Middleware](/techniques/middleware)
