# Kitchen Sink — End-to-End Banhmi Showcase

The kitchen-sink example wires virtually every first-party Banhmi package into
a single runnable application. The domain is a minimal **task tracker / journal
API**, which provides natural surfaces for HTTP, auth, queues, scheduling,
events, SSE, WebSockets, observability, and more.

## Quick start

```bash
cd examples/kitchen-sink
bun install   # only needed on first run
bun run dev
```

The server starts on **http://localhost:3000**. No external services required:
SQLite runs in-memory and Redis falls back to a mock when unavailable.

---

## Feature tour

### Auth

| Feature | URL | How to try |
|---------|-----|-----------|
| Login (local) | `POST /api/auth/login` | `curl -X POST localhost:3000/api/auth/login -H 'content-type: application/json' -d '{"username":"admin","password":"password"}'` |
| JWT-protected route | `GET /api/me` | `curl localhost:3000/api/me -H 'Authorization: Bearer <token>'` |

### Tasks (versioning + validation + throttling)

| Feature | URL | How to try |
|---------|-----|-----------|
| Create task (v1) | `POST /v1/tasks` | `curl -X POST localhost:3000/v1/tasks -H 'content-type: application/json' -d '{"title":"Hello world","status":"pending"}'` |
| Validation error | `POST /v1/tasks` | `curl -X POST localhost:3000/v1/tasks -H 'content-type: application/json' -d '{}'` → 400 |
| List tasks (v1) | `GET /v1/tasks` | `curl localhost:3000/v1/tasks` — serialized via `@banhmi/transform`, cached 30 s |
| List tasks (v2) | `GET /v2/tasks` | `curl localhost:3000/v2/tasks` — full entity including description |
| Throttle (5 req/min) | `PATCH /v1/tasks/:id` | Send 6 rapid requests; 6th returns 429 |
| Delete a task | `DELETE /v1/tasks/:id` | `curl -X DELETE localhost:3000/v1/tasks/1` |

### File attachments

| Feature | URL | How to try |
|---------|-----|-----------|
| Upload a file | `POST /v1/tasks/:id/attachments` | `curl -X POST localhost:3000/v1/tasks/1/attachments -F 'file=@/path/to/file'` |
| Serve a file | `GET /v1/tasks/:id/attachments/:name` | `curl localhost:3000/v1/tasks/1/attachments/file.txt` |

### Real-time

| Feature | URL | How to try |
|---------|-----|-----------|
| SSE — task events | `GET /events` | `curl -N localhost:3000/events` |
| WebSocket gateway | `ws://localhost:3000/ws/tasks` | `websocat ws://localhost:3000/ws/tasks` then send `{"event":"subscribe","data":null}` |

### Observability

| Feature | URL | How to try |
|---------|-----|-----------|
| Health check | `GET /api/health` | `curl localhost:3000/api/health` |
| OpenAPI docs (Scalar UI) | `GET /api/docs` | Open in browser |
| OpenAPI JSON spec | `GET /api/docs/openapi.json` | `curl localhost:3000/api/docs/openapi.json` |
| Devtools | `GET /__banhmi/devtools` | Open in browser — DI graph, routes, profile |

---

## Features wired

| Package | What it does in this app |
|---------|-------------------------|
| `@banhmi/auth` | `LocalStrategy` for login; `JwtStrategy` for `GET /api/me` |
| `@banhmi/jwt` | Signs and verifies HS256 JWT tokens |
| `@banhmi/versioning` | URI versioning — `/v1/tasks` vs `/v2/tasks` |
| `@banhmi/validation` | `classValidator` DTOs on `POST /v1/tasks` and `PATCH` |
| `@banhmi/throttler` | 5 req/min limit on `PATCH /v1/tasks/:id` |
| `@banhmi/sqlite` | In-memory SQLite via `SqliteModule.forRoot(':memory:')` |
| `@banhmi/events` | In-process `EventEmitter` — `task.created` / `task.deleted` |
| `@banhmi/sse` | SSE stream on `GET /events` relaying task events |
| `@banhmi/queue` | `emails` queue enqueued on task creation; mock mailer processor |
| `@banhmi/scheduling` | GC cron via `@Interval(60_000)` on `CleanupService` |
| `@banhmi/transform` | `serialize(task, TaskDto)` strips unexpected fields |
| `@banhmi/cache` | `@Cacheable(30, …)` on `TasksService.listCached()` |
| `@banhmi/multipart` | File upload on `POST /v1/tasks/:id/attachments` |
| `@banhmi/static` | Zero-copy file serving on `GET /v1/tasks/:id/attachments/:name` |
| `@banhmi/compression` | gzip for responses > 1 KB |
| `@banhmi/cookies` | Signed session cookie set on every request (middleware) |
| `@banhmi/security` | Helmet + CORS headers (CSRF omitted — conflicts with JSON login) |
| `@banhmi/health` | Memory indicator on `GET /api/health` |
| `@banhmi/openapi` | Scalar UI on `GET /api/docs` with all controllers documented |
| `@banhmi/devtools` | DI graph + route explorer on `GET /__banhmi/devtools` |
| `@banhmi/logger` | Structured logs everywhere via `@InjectLogger` / child loggers |
| `@banhmi/redis` | Mock-backed queue (real Redis optional via `REDIS_URL`) |
| WebSocket gateway | `TasksGateway` on `ws://…/ws/tasks` — subscribe + ping/pong |

**Omitted features (with reason):**
- CSRF — conflicts with the stateless JSON login flow. Enable in production
  behind a proper SPA with cookie-based sessions.
- `@banhmi/postgres` — requires a running Postgres instance. The SQLite
  in-memory store covers the same data-access patterns.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port (`0` = random, useful for tests) |
| `JWT_SECRET` | `kitchen-sink-dev-secret-min-32-chars!!` | HS256 signing key |
| `COOKIE_SECRET` | `kitchen-sink-cookie-secret` | Signed-cookie secret |
| `REDIS_URL` | `redis://localhost:6379` | Optional Redis for real queue persistence |
| `UPLOADS_DIR` | `./uploads` | Directory for multipart file uploads |

---

## Running tests

```bash
bun test examples/kitchen-sink
```

17 integration tests cover: health, auth (login + JWT), versioning, validation,
throttling, deletes, OpenAPI, devtools, queue counter, EventEmitter, SSE
endpoint, and WebSocket.
