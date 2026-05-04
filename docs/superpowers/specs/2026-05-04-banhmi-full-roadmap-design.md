# Banhmi Full Roadmap Design

**Date:** 2026-05-04  
**Scope:** All remaining roadmap items — test gaps, v0.3–v0.6, v1.0 (all packages), CLI, docs site  
**Strategy:** Approach C — close test gaps first, then v0.3→v0.6 in order, then v1.0 in two parallel streams, then CLI + docs last

---

## 0. Test Gap Closure (no new packages)

Two untested behaviors introduced during recent work:

### 0.1 Method-level enhancer isolation (`@banhmi/common`)

`@UseGuards`, `@UseInterceptors`, `@UseFilters` now support two scopes:
- **Class decorator** → applied to every route on that controller
- **Method decorator** → applied only to that specific route

Missing tests in `packages/common/test/decorators/enhancers.test.ts`:
- Class-scoped `@UseGuards` stores in `GUARDS_METADATA` as flat array
- Method-scoped `@UseGuards` stores in `METHOD_GUARDS_METADATA` as `Record<methodName, Guard[]>`
- Both scopes coexist without leaking across methods

### 0.2 Route-explorer method-guard merging (`@banhmi/platform-bun`)

Missing tests in `packages/platform-bun/test/route-explorer.test.ts`:
- A guard on `methodA` does not appear on `methodB`'s registered route
- Class guards merge with method guards: `[...classGuards, ...methodGuards[name]]`

---

## 1. v0.3 — `@banhmi/sqlite`

**Package:** `packages/sqlite/` → `@banhmi/sqlite`

### 1.1 Architecture

Three concerns: module registration, token injection, and repository pattern.

```
SqliteModule.forRoot(path, options?)
  └─ FactoryProvider { provide: SQLITE_DB_TOKEN, useFactory: () => new Database(path, options) }
  └─ sets PRAGMA journal_mode = WAL on creation

SQLITE_DB_TOKEN  ← the DI token; users do: static inject = [SQLITE_DB_TOKEN] as const

@Repository(Entity)  ← class decorator
  └─ reads table name from Entity[Symbol.metadata][TABLE_METADATA]
  └─ exposes: findAll(), findById(id), save(entity), delete(id), transaction(fn)
  └─ .as(Class) for typed row mapping via db.query<T>(...).get()
```

No `@InjectDatabase()` field decorator — that would contradict the project's "no `@Inject()` decorator" rule. `SQLITE_DB_TOKEN` is exported directly; users inject via `static inject`.

### 1.2 DI Integration

`SqliteModule` exports `SQLITE_DB_TOKEN`. Consumer modules `import: [SqliteModule]` and services inject via `static inject`:

```ts
import { SQLITE_DB_TOKEN } from '@banhmi/sqlite'
import type { Database } from 'bun:sqlite'

@Injectable()
export class UsersService {
  static inject = [SQLITE_DB_TOKEN] as const
  constructor(private db: Database) {}
}
```

`@Repository(Entity)` is a standalone decorator — no DI required. It adds query methods to the class prototype using the injected `Database` instance.

### 1.3 Entity / Table Definition

```ts
@Table('users')
export class User {
  id!: number
  name!: string
  email!: string
}
```

`@Table(name)` stores the table name in `Symbol.metadata`. `@Repository` reads it at decoration time.

### 1.4 File Structure

```
packages/sqlite/
  src/
    sqlite.module.ts       # SqliteModule + SQLITE_DB_TOKEN
    inject-database.ts     # @InjectDatabase() decorator
    repository.ts          # @Repository(Entity) decorator
    table.ts               # @Table(name) decorator
    index.ts
  test/
    sqlite.test.ts         # module wiring, token resolution
    repository.test.ts     # findAll, findById, save, delete, transaction, WAL
  package.json
  bunfig.toml
  tsconfig.json
```

### 1.5 Tests

- `SqliteModule.forRoot` registers `Database` provider under `SQLITE_DB_TOKEN`
- WAL pragma applied on init
- `@Repository` `findAll()` returns all rows typed as `Entity[]`
- `@Repository` `findById(id)` returns single row or throws `NotFoundException`
- `@Repository` `save(entity)` inserts (no `id`) or updates (has `id`)
- `@Repository` `delete(id)` removes row, throws `NotFoundException` if missing
- `transaction(fn)` commits on success, rolls back on error
- `.as(UserClass)` maps raw rows to typed instances

---

## 2. v0.4 — `@banhmi/s3`

**Package:** `packages/s3/` → `@banhmi/s3`

### 2.1 Architecture

Thin wrapper around Bun's native `S3Client`. No HTTP dependencies.

```
S3Module.forRoot(config)
  └─ FactoryProvider { provide: S3_CLIENT_TOKEN, useFactory: () => new S3Client(config) }

@InjectS3()  ← sugar for static inject = [S3_CLIENT_TOKEN]

S3Service  ← injectable service wrapping S3Client
  upload(key, body, options?)    → Promise<void>
  download(key)                  → Promise<ArrayBuffer>
  presign(key, expiresIn)        → string
  delete(key)                    → Promise<void>
  writer(key, options?)          → FileSink  (streaming multipart)
```

### 2.2 Config Resolution

```ts
S3Module.forRoot({
  bucket: Bun.env.S3_BUCKET,
  region: Bun.env.S3_REGION ?? Bun.env.AWS_REGION,
  accessKeyId: Bun.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY,
  endpoint: Bun.env.S3_ENDPOINT,   // for R2/MinIO
})
```

`S3Module.forRootAsync(factory)` for DI-resolved config (e.g. reading from `ConfigService`).

### 2.3 File Structure

```
packages/s3/
  src/
    s3.module.ts       # S3Module + S3_CLIENT_TOKEN
    s3.service.ts      # S3Service
    inject-s3.ts       # @InjectS3()
    index.ts
  test/
    s3.test.ts         # mock S3Client, test each method + env defaults
  package.json
  bunfig.toml
  tsconfig.json
```

### 2.4 Tests

- `S3Module.forRoot` registers `S3Client` under `S3_CLIENT_TOKEN`
- `upload` calls `client.file(key).write(body)`
- `download` calls `client.file(key).arrayBuffer()`
- `presign` calls `client.file(key).presign({ expiresIn })`
- `delete` calls `client.file(key).delete()`
- `writer` returns `client.file(key).writer()`
- Env-var defaults read from `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, etc.

---

## 3. v0.5 — `@banhmi/redis` + `@banhmi/cache`

### 3.1 `@banhmi/redis`

**Package:** `packages/redis/` → `@banhmi/redis`  
**Dependency:** `ioredis` (stable reconnection, pipelining, Lua scripting — raw TCP would need to re-implement all of this)

```
RedisModule.forRoot(url)
  └─ FactoryProvider { provide: REDIS_CLIENT_TOKEN, useFactory: () => new Redis(url) }

@InjectRedis()  ← shorthand

RedisService  ← wraps ioredis with typed helpers
  get(key)                     → Promise<string | null>
  set(key, value, ttl?)        → Promise<void>
  del(...keys)                 → Promise<number>
  expire(key, seconds)         → Promise<boolean>
  publish(channel, message)    → Promise<number>
  subscribe(channel, handler)  → Promise<void>
```

### 3.2 `@banhmi/cache`

**Package:** `packages/cache/` → `@banhmi/cache`

```
CacheModule.forRoot({ store: 'memory' | 'redis', ttl?: number })
  └─ 'memory' → registers MemoryStore as CACHE_STORE_TOKEN
  └─ 'redis'  → requires REDIS_CLIENT_TOKEN (import RedisModule first)
               → registers RedisStore as CACHE_STORE_TOKEN

CacheStore interface:
  get(key): Promise<unknown | null>
  set(key, value, ttl): Promise<void>
  del(key): Promise<void>

MemoryStore: Map<string, { value, expiresAt: number | null }>
  └─ lazy expiry: check expiresAt on get, return null if expired
  └─ no background sweep (YAGNI — add if benchmarks show pressure)

RedisStore: wraps REDIS_CLIENT_TOKEN
  └─ get → JSON.parse(await redis.get(key))
  └─ set → redis.set(key, JSON.stringify(value), 'PX', ttl * 1000)
  └─ del → redis.del(key)
```

### 3.3 `@Cacheable` + `@CacheEvict`

Both use the existing `Interceptor` mechanism in the enhancer pipeline.

```ts
@Cacheable({ ttl: 60 })                         // auto-key: "GET:/users/1"
@Cacheable({ ttl: 60, key: ctx => `u:${ctx.params.id}` })  // explicit key fn

@CacheEvict('user-list')                        // static key
@CacheEvict(ctx => `u:${ctx.params.id}`)        // key fn
```

Auto-key derivation: `"${request.method}:${url.pathname}"` from `RouteCtx`.

`@Cacheable` creates a `CacheInterceptor` **instance** (not class) closed over the resolved store and options, and stores the instance in `METHOD_INTERCEPTORS_METADATA`. `@CacheEvict` creates a `CacheEvictInterceptor` instance similarly.

This requires a one-line change to the enhancer pipeline: `match.interceptors.map((I) => typeof I === 'function' ? new (I as new () => Interceptor)() : I)` — pre-created instances pass through, classes are still instantiated normally. No other pipeline changes needed.

The store is resolved at `CacheModule` init time (before any request arrives) and closed over by the interceptor instances — no per-request DI lookup needed.

### 3.4 File Structure

```
packages/redis/
  src/
    redis.module.ts    # RedisModule + REDIS_CLIENT_TOKEN
    redis.service.ts   # RedisService
    inject-redis.ts    # @InjectRedis()
    index.ts
  test/
    redis.test.ts

packages/cache/
  src/
    cache.module.ts    # CacheModule + CACHE_STORE_TOKEN
    memory-store.ts    # MemoryStore
    redis-store.ts     # RedisStore
    cacheable.ts       # @Cacheable decorator + CacheInterceptor
    cache-evict.ts     # @CacheEvict decorator + CacheEvictInterceptor
    interfaces.ts      # CacheStore interface
    index.ts
  test/
    memory-store.test.ts   # hit, miss, expiry, del
    redis-store.test.ts    # mock ioredis
    cacheable.test.ts      # caches on first call, returns cached on second
    cache-evict.test.ts    # invalidates after call
```

### 3.5 Tests

**Redis:** mock `ioredis`, assert each `RedisService` method calls correct ioredis API.

**Cache memory store:** get miss returns null; set+get returns value; expired entry returns null; del removes entry.

**Cache redis store:** get calls `redis.get` + JSON.parse; set calls `redis.set` with `PX`; del calls `redis.del`.

**`@Cacheable`:** first call executes handler + stores result; second call returns cached result without calling handler; TTL passed to store.

**`@CacheEvict`:** handler executes; store `del` called with correct key after response.

---

## 4. v0.6 — Streams

**Packages affected:** `@banhmi/common` (new exports), `@banhmi/platform-bun` (adapter changes)  
**No new package** — streams are a response-shaping concern, not a standalone module.

### 4.1 `StreamableFile`

```ts
class StreamableFile {
  constructor(
    stream: ReadableStream | Bun.BunFile | Uint8Array,
    options?: { contentType?: string; filename?: string }
  )
  getStream(): ReadableStream
  getContentType(): string
  getFilename(): string | undefined
}
```

`BunAdapter.dispatchRoute` checks `instanceof StreamableFile` on the handler return value. If true, builds a `Response` with the stream body and correct headers (`Content-Type`, `Content-Disposition` if filename set).

### 4.2 `@Sse()` + `SseEvent`

```ts
interface SseEvent {
  data: string | object
  event?: string
  id?: string
  retry?: number
}

@Sse()  // method decorator — marks handler as SSE producer
// Handler signature: (ctx: RouteCtx) => AsyncIterable<SseEvent>
```

`BunAdapter` detects `SSE_METADATA` on the matched route and wraps the handler's async iterable in a `ReadableStream` that formats each event as:
```
event: <name>\n
id: <id>\n
retry: <ms>\n
data: <json>\n\n
```
Returns `new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })`.

### 4.3 `StreamInterceptor`

```ts
abstract class StreamInterceptor implements Interceptor {
  abstract transform(chunk: unknown): unknown
  intercept(ctx: ExecutionContext, next: CallHandler): Promise<Response> {
    // wraps next.handle() — if result is AsyncIterable, maps each chunk through transform()
  }
}
```

### 4.4 Tests

- `StreamableFile` with `ReadableStream` → correct `getStream()` / `getContentType()`
- `StreamableFile` with `Bun.BunFile` → wraps in `ReadableStream`
- `StreamableFile` with `Uint8Array` → wraps in `ReadableStream`
- `@Sse()` stores `SSE_METADATA` on method
- SSE formatter: `SseEvent` with all fields → correct multi-line string
- SSE formatter: `SseEvent` with only `data` → minimal format
- `StreamInterceptor` subclass: `transform` called for each emitted chunk

---

## 5. v1.0 Stream A — `@banhmi/config` + `@banhmi/jwt`

### 5.1 `@banhmi/config`

**Package:** `packages/config/`

```
ConfigModule.forRoot({ schema, envFile?: string })
  └─ loads envFile (default: '.env') via Bun.file
  └─ merges with Bun.env (Bun.env takes precedence)
  └─ validates merged env against Standard Schema (zod/valibot/etc.)
  └─ throws at bootstrap if validation fails — fail fast
  └─ registers ConfigService as provider

ConfigService
  get<K extends keyof Schema>(key: K): InferredType<K>
  getOrThrow<K>(key: K): NonNullable<InferredType<K>>

@InjectConfig()  ← shorthand
```

Standard Schema means any library implementing the `StandardSchemaV1` interface works — no lock-in to zod.

### 5.2 `@banhmi/jwt`

**Package:** `packages/jwt/`  
**Dependency:** `jose` (standards-based JOSE library, runtime-agnostic, works with Bun's Web Crypto API)

```
JwtModule.forRoot({ secret, expiresIn?: string | number })
  └─ registers JwtService

JwtService
  sign(payload: object): Promise<string>
  verify(token: string): Promise<JwtPayload | null>  // null on invalid/expired

JwtGuard implements Guard
  └─ reads Authorization: Bearer <token>
  └─ calls jwtService.verify(token)
  └─ throws UnauthorizedException if null
  └─ stores payload in request-scoped slot via RouteCtx

@CurrentUser()  ← parameter-position marker (stored via SetMetadata)
  └─ handler reads ctx.state.user (set by JwtGuard)
```

`RouteCtx` gains `state?: Record<string, unknown>` (optional, initialized lazily) for guard-to-handler communication. `JwtGuard` writes to `ctx.state.user`; `@CurrentUser()` is a convenience that signals the handler to read from there. `BunRouteCtx` initializes `state = {}` so handlers never get `undefined`.

### 5.3 File Structure

```
packages/config/
  src/
    config.module.ts
    config.service.ts
    inject-config.ts
    index.ts
  test/
    config.test.ts

packages/jwt/
  src/
    jwt.module.ts
    jwt.service.ts
    jwt.guard.ts
    current-user.ts    # @CurrentUser() decorator
    index.ts
  test/
    jwt.service.test.ts
    jwt.guard.test.ts
```

### 5.4 Tests

**Config:** valid env + schema passes; invalid env throws at `forRoot`; `get()` returns correct typed value; `getOrThrow()` throws on undefined; `.env` file loaded and merged.

**JWT:** `sign` + `verify` round-trip returns original payload; expired token returns `null`; tampered token returns `null`; `JwtGuard.canActivate` passes with valid token; `JwtGuard.canActivate` throws `UnauthorizedException` with missing/invalid token; `state.user` populated after guard runs.

---

## 6. v1.0 Stream B — `@banhmi/testing` + `@banhmi/swagger`

### 6.1 `@banhmi/testing`

**Package:** `packages/testing/`

```
BanhmiTestingModule
  .create(metadata: ModuleMetadata): TestingModuleBuilder

TestingModuleBuilder
  .overrideProvider(token, { useValue | useFactory | useClass }): this
  .compile(): Promise<TestingModule>

TestingModule
  .get<T>(token): T        // resolved instance
  .close(): Promise<void>  // run onModuleDestroy hooks
```

Internally reuses `Container` + `ModuleGraph` from `@banhmi/core`. `overrideProvider` replaces entries in the provider map before `Container.resolve` runs. No HTTP server started — pure DI resolution.

### 6.2 `@banhmi/swagger`

**Package:** `packages/swagger/`  
**Dependency:** `swagger-ui-dist` (static HTML/JS/CSS for the browser UI)

```
// Metadata decorators (stored in Symbol.metadata):
@ApiOperation({ summary, description? })
@ApiParam({ name, description?, required?, schema? })
@ApiBody({ schema, description? })
@ApiResponse({ status, description, schema? })
@ApiTags(...tags)

// Document builder:
DocumentBuilder
  .setTitle(title)
  .setVersion(version)
  .addTag(name, description?)
  .build(): OpenApiDocument

// Module:
SwaggerModule.generateDocument(app, builder): OpenApiDocument
  └─ walks all registered routes
  └─ reads @ApiOperation, @ApiParam, @ApiBody, @ApiResponse from Symbol.metadata
  └─ merges with RouteExplorer metadata (path params, method)
  └─ returns OpenAPI 3.0 object

SwaggerModule.setup(path, app, document): void
  └─ mounts GET {path}          → swagger-ui HTML
  └─ mounts GET {path}-json     → JSON document
```

### 6.3 Tests

**Testing module:** provider resolves from `get()`; `overrideProvider(useValue)` returns mock; `overrideProvider(useFactory)` calls factory; `close()` runs destroy hooks.

**Swagger:** `@ApiOperation` stores metadata; `@ApiResponse` stores metadata; `DocumentBuilder.build()` produces correct title/version; `generateDocument` includes all routes; path params auto-extracted from route pattern (`:id` → `{id}`).

---

## 7. CLI — `@banhmi/cli` (`apps/cli/`)

**Location:** `apps/cli/` (not under `packages/` — not a framework library)  
**Dependencies:** `citty` (command routing), `@clack/prompts` (interactive input)  
**Output:** standalone Bun binary via `bun build --compile`

### 7.1 Commands

```
banhmi new <name>                 # scaffold new project
banhmi generate controller <name> # alias: banhmi g c <name>
banhmi generate service <name>    # alias: banhmi g s <name>
banhmi generate module <name>     # alias: banhmi g m <name>
banhmi generate gateway <name>    # alias: banhmi g g <name>
```

`banhmi new` is interactive when `<name>` is omitted: prompts for project name, port, whether to include example controller.

### 7.2 Template System

Templates are plain `.ts` files in `apps/cli/templates/` with substitution tokens:

| Token | Example output |
|-------|---------------|
| `__NAME_PASCAL__` | `UserProfile` |
| `__NAME_CAMEL__` | `userProfile` |
| `__NAME_KEBAB__` | `user-profile` |
| `__NAME_SNAKE__` | `user_profile` |

Template files are embedded at compile time via `Bun.file` reads during build, or bundled as static strings.

### 7.3 `banhmi new` scaffold output

```
<name>/
  src/
    app.module.ts
    app.controller.ts
    main.ts
  bunfig.toml
  package.json
  tsconfig.json
  .gitignore
```

### 7.4 File Structure

```
apps/cli/
  src/
    main.ts              # citty runMain entry
    commands/
      new.ts             # banhmi new
      generate.ts        # banhmi generate (routes to sub-commands)
      generate/
        controller.ts
        service.ts
        module.ts
        gateway.ts
    lib/
      template.ts        # substituteTokens(template, name) → string
      names.ts           # toPascal, toCamel, toKebab, toSnake
      write-file.ts      # writeGeneratedFile(path, content)
  templates/
    new/                 # full project scaffold
    controller.ts.tmpl
    service.ts.tmpl
    module.ts.tmpl
    gateway.ts.tmpl
  test/
    template.test.ts     # token substitution
    names.test.ts        # casing transforms
    generate.test.ts     # file path + content per command (no actual disk writes)
  package.json
```

### 7.5 Tests

- `toPascal('user-profile')` → `'UserProfile'`
- `toCamel('UserProfile')` → `'userProfile'`
- `toKebab('UserProfile')` → `'user-profile'`
- `substituteTokens(template, 'userProfile')` replaces all four tokens
- `generate controller users` → correct file path + content snapshot
- `generate service auth` → correct file path + content snapshot

---

## 8. Docs Site — `apps/docs/`

**Location:** `apps/docs/`  
**Stack:** TanStack Start (Vite + React, file-based routing), MDX for content, Pagefind for search

### 8.1 Site Structure

```
/                         # landing page
/docs/getting-started     # install, first app, project structure
/docs/core/               # DI, modules, lifecycle, decorators, enhancers
/docs/packages/sqlite     # one page per package
/docs/packages/s3
/docs/packages/redis
/docs/packages/cache
/docs/packages/config
/docs/packages/jwt
/docs/packages/swagger
/docs/packages/testing
/docs/websockets          # WS gateway guide
/docs/streams             # StreamableFile, SSE
/docs/cli                 # CLI reference
/examples                 # links to examples/ in repo
/api                      # OpenAPI generated from @banhmi/swagger
```

### 8.2 Key Decisions

- **MDX** for all content pages — code blocks, callouts, API tables as components
- **Pagefind** for search — runs as a post-build step, zero server dependency
- **No custom design system** — use Tailwind CSS with a minimal prose theme
- **API reference** — generated at build time by running `SwaggerModule.generateDocument` against a dummy app that registers all packages; rendered as a Swagger UI page
- **No unit tests** for the docs app — it's a content site, correctness verified by build

### 8.3 File Structure

```
apps/docs/
  app/
    routes/
      index.tsx              # landing
      docs/
        getting-started.mdx
        core/
          dependency-injection.mdx
          modules.mdx
          ...
        packages/
          sqlite.mdx
          ...
      examples.tsx
      api.tsx
    components/
      nav.tsx
      prose.tsx
      code-block.tsx
  public/
  package.json
  vite.config.ts
  tailwind.config.ts
```

---

## Implementation Order Summary

| Step | Work | New packages |
|------|------|-------------|
| 0 | Close test gaps | — |
| 1 | v0.3 SQLite | `@banhmi/sqlite` |
| 2 | v0.4 S3 | `@banhmi/s3` |
| 3 | v0.5 Redis + Cache | `@banhmi/redis`, `@banhmi/cache` |
| 4 | v0.6 Streams | additions to `@banhmi/common`, `@banhmi/platform-bun` |
| 5a | `@banhmi/config` + `@banhmi/jwt` | `@banhmi/config`, `@banhmi/jwt` |
| 5b | `@banhmi/testing` + `@banhmi/swagger` | `@banhmi/testing`, `@banhmi/swagger` |
| 6 | CLI | `apps/cli/` |
| 7 | Docs site | `apps/docs/` |

Steps 5a and 5b are independent and can be executed in parallel (separate worktrees).  
Steps 6 and 7 depend on the stable API surface from steps 1–5.

---

## Cross-Cutting Decisions

- **Every new package** gets `package.json` + `bunfig.toml` (polyfill preload) + `tsconfig.json` extending root
- **Every new package** exports from `packages/banhmi/src/index.ts` (except `@banhmi/testing` — test-only, imported directly from `@banhmi/testing` in test files, never re-exported by the main facade)
- **Testing philosophy:** unit tests for all business logic; integration tests (real server) for HTTP/WS behavior; no mocking of banhmi internals in unit tests — use `BanhmiTestingModule` instead
- **No `any`:** all new code uses `unknown` + narrowing
- **Biome** enforced on all new code before commit
