# Banhmi Roadmap

> Bun-first, NestJS-inspired TypeScript framework.  
> Minimal deps. Native APIs. TC39 decorators.

---

## Current State — v0.1 (shipped)

- TC39 Stage 3 decorators with `Symbol.metadata`
- Static-`inject` DI container with circular-dep detection
- Module graph (imports, providers, controllers, exports)
- Lifecycle hooks (`onModuleInit`, `onModuleDestroy`, `onApplicationBootstrap`, `onApplicationShutdown`)
- `BunnestApplication` + `BunAdapter` on raw `Bun.serve`
- `RadixRouter` with `:param`, `:param?`, and `*` wildcard matching
- Enhancer pipeline: Guards → Interceptors → Pipes → Handler → Filters
- Built-in exceptions (`NotFoundException`, `BadRequestException`, etc.)
- Built-in pipes (`ParseIntPipe`, `ParseUUIDPipe`, `ParseBoolPipe`, `ValidationPipe`)
- `@Controller`, `@Get/Post/Put/Patch/Delete/Options/Head/All`, `@HttpCode`, `@Header`, `@Redirect`
- `@UseGuards`, `@UseInterceptors`, `@UseFilters`, `@UsePipes`, `@SetMetadata`
- Integration test suite (90 tests, real Bun server)

---

## v0.2 — WebSockets  _(target: Q3 2026)_

**New package:** `@banhmi/websockets`

### Features
- `@WebSocketGateway(port?, options?)` decorator on classes
- `@SubscribeMessage('event')` handler decorator
- `@WebSocketServer()` property decorator to inject the `ServerWebSocket` instance
- `WsAdapter` wrapping `Bun.serve({ websocket: {...} })` — typed `ws.data` via generic param
- Pub/sub helpers: `gateway.to(room).emit(event, data)`, `gateway.broadcast(event, data)`
- Lifecycle: `onGatewayInit`, `onGatewayConnection`, `onGatewayDisconnect` interfaces
- Per-message compression via `perMessageDeflate: true`
- Idle timeout config

### Bun APIs Used
```ts
Bun.serve({
  fetch(req, server) { server.upgrade(req, { data: { userId } }) },
  websocket: {
    open(ws)           { ws.subscribe('room') },
    message(ws, msg)   { ws.publish('room', msg) },
    close(ws, code)    { },
    drain(ws)          { },
    perMessageDeflate: true,
    idleTimeout: 60,
  },
})
```

---

## v0.3 — SQLite  _(target: Q4 2026)_

**New package:** `@banhmi/sqlite`

### Features
- `SqliteModule.forRoot(path, options?)` — registers `Database` as a provider
- `@InjectDatabase()` — shorthand token injection
- `@Repository(Entity)` — simple active-record style with `.findAll()`, `.findById()`, `.save()`, `.delete()`
- Transaction support via `db.transaction(fn)`
- WAL mode enabled by default (`PRAGMA journal_mode = WAL`)
- `.as(EntityClass)` for type-safe row mapping

### Bun APIs Used
```ts
import { Database } from 'bun:sqlite'

const db = new Database('app.sqlite', { strict: true })
db.exec('PRAGMA journal_mode = WAL')
const stmt = db.query<User, [number]>('SELECT * FROM users WHERE id = ?')
const user = stmt.get(1)  // typed as User | null
```

---

## v0.4 — S3 / Object Storage  _(target: Q1 2027)_

**New package:** `@banhmi/s3`

### Features
- `S3Module.forRoot(config)` — registers `S3Client` as a provider
- `@InjectS3()` — inject the configured client
- Helpers: `upload(key, body)`, `download(key)`, `presign(key, expiresIn)`, `delete(key)`
- Streaming multipart upload via `.writer()`
- Compatibility: AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, GCS (S3-compatible)
- Reads `S3_*` / `AWS_*` env vars by default (same as Bun native)

### Bun APIs Used
```ts
import { s3, S3Client } from 'bun'

const client = new S3Client({ bucket: 'my-bucket', region: 'us-east-1' })
const file = client.file('uploads/photo.jpg')
await file.write(buffer)
const url = file.presign({ expiresIn: 3600 })
```

---

## v0.5 — Redis / Caching  _(target: Q2 2027)_

**New package:** `@banhmi/redis`  
**New package:** `@banhmi/cache`

### Features (`@banhmi/redis`)
- `RedisModule.forRoot(url)` — connection via `Bun.connect` (TCP) or `bun:redis` (when available)
- Typed client: `get/set/del/expire/publish/subscribe`
- Pub/sub for real-time messaging

### Features (`@banhmi/cache`)
- `@Cacheable(ttl)` method decorator — cache handler result
- `@CacheEvict(key)` — invalidate on mutation
- `CacheModule.forRoot({ store: 'redis' | 'memory' })`
- Default in-memory store via `Map` + TTL for zero-dep usage

---

## v0.6 — Streams  _(target: Q3 2027)_

### Features
- `StreamableFile` response wrapper — pipes a `ReadableStream` as HTTP response
- `@Sse()` decorator for Server-Sent Events
- `StreamInterceptor` base class for transform streams
- File serving helpers using `Bun.file(path)`

### Bun APIs Used
```ts
// File response (zero-copy):
return new Response(Bun.file('./large.pdf'))

// SSE:
return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
```

---

## v1.0 — Stable API  _(target: Q4 2027)_

- Stable public API with semver guarantees
- Full documentation site (separate repo, Turborepo workspace)
- `@banhmi/testing` — `BanhmiTestingModule` for unit/integration test helpers
- `@banhmi/config` — typed config service with env validation
- `@banhmi/jwt` — JWT guard + strategy
- `@banhmi/swagger` — OpenAPI spec generation from decorators
- CLI: `banhmi new`, `banhmi generate controller/service/module`

---

## v2.0 — TypeScript 6/7 Compatibility  _(target: 2028)_

### Planned Changes

| Area | TS 5.x Today | TS 6/7 Direction |
|---|---|---|
| Decorators | TC39 Stage 3 (already) | No change expected |
| `Symbol.metadata` | Polyfill required | Native browser/runtime support expected |
| `import type` enforcement | Manual | May become stricter by default |
| `using` / `Symbol.dispose` | Available | Adopt for resource cleanup (db, server) |
| Type narrowing | Current inference | Improved — remove defensive casts |

**Migration plan:**
1. Track TypeScript releases; run nightly CI against `typescript@next`
2. When TS ships `Symbol.metadata` natively, remove the polyfill and `bunfig.toml` preload
3. Adopt `using db = new Database(...)` pattern in `@banhmi/sqlite` when `Symbol.dispose` is stable
4. No breaking API changes for TS 6 — framework stays decorator-first

---

## NestJS vs Banhmi — Feature Comparison

| Feature | NestJS | Banhmi |
|---|---|---|
| **Runtime** | Node.js (default) | Bun (native) |
| **HTTP adapter** | Express / Fastify | Raw `Bun.serve` |
| **Decorator style** | Legacy `experimentalDecorators` | TC39 Stage 3 |
| **Metadata** | `reflect-metadata` | `Symbol.metadata` (polyfill) |
| **DI** | `@Injectable()` + `@Inject()` | `static inject = [...]` |
| **Module system** | `@Module({ imports, providers })` | Same API |
| **Guards** | `CanActivate` interface | `Guard` interface |
| **Interceptors** | `NestInterceptor` | `Interceptor` interface |
| **Pipes** | `PipeTransform` | `PipeTransform` interface |
| **Exception filters** | `ExceptionFilter` | `ExceptionFilter<T>` |
| **Lifecycle hooks** | 4 hooks | Same 4 hooks |
| **WebSockets** | `@nestjs/websockets` | Planned v0.2 |
| **SQLite** | Via TypeORM/Prisma | Native `bun:sqlite` — planned v0.3 |
| **S3** | Via AWS SDK | Native `bun` S3 — planned v0.4 |
| **Redis** | `@nestjs/bull`, `cache-manager` | Planned v0.5 |
| **Config** | `@nestjs/config` | Planned v1.0 |
| **JWT** | `@nestjs/jwt` | Planned v1.0 |
| **Swagger** | `@nestjs/swagger` | Planned v1.0 |
| **Testing module** | `@nestjs/testing` | Planned v1.0 |
| **CLI** | `@nestjs/cli` | Planned v1.0 |
| **Microservices** | `@nestjs/microservices` | Not planned |
| **GraphQL** | `@nestjs/graphql` | Not planned |
| **Cold start** | ~300–800ms (Node) | ~10–50ms (Bun) |
| **Bundle size** | ~120KB+ (with Express) | ~0 external deps |
| **reflect-metadata** | Required | Not used |

### What Banhmi Intentionally Omits

- **Microservices** — use Bun's native TCP/UDP directly or a dedicated message broker
- **GraphQL** — orthogonal concern; use a standalone GraphQL library
- **Platform-agnostic adapters** — Bun-only by design; no Express/Fastify shim

---

## Release Process

- **Changesets** — `@changesets/cli` already installed; run `bun changeset` to record changes
- Packages published independently with scoped versioning
- `banhmi` meta-package version tracks the lowest-versioned dependency
