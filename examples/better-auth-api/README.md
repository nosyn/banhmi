# better-auth-api

A banhmi example demonstrating [Better Auth](https://better-auth.com) email/password authentication with `bun:sqlite`.

## What it shows

- Better Auth mounted as banhmi middleware — all `/api/auth/**` requests are forwarded to `auth.handler`
- `AuthGuard` using `auth.api.getSession` to protect individual routes
- Public vs protected endpoints on the same controller
- Zero-config SQLite database via `bun:sqlite`

## Setup

```bash
# From repo root
bun install

# Set required env vars (create a .env or export in shell)
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
export BETTER_AUTH_URL="http://localhost:3001"
```

## Run migrations

Creates the `better-auth.sqlite` database with `user`, `session`, `account`, and `verification` tables:

```bash
cd examples/better-auth-api
bunx --bun auth@latest migrate
```

## Start dev server

```bash
bun run dev
# or from repo root:
bun run --cwd examples/better-auth-api dev
```

Server runs on `http://localhost:3001`.

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
