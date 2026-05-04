# Banhmi Framework Design Spec
_2026-05-03_

## Overview

Banhmi is a Bun-first, TypeScript web framework inspired by NestJS's architectural elegance — modules, dependency injection, decorators, enhancers — but built from scratch around Bun's native APIs and TC39 Stage 3 decorators. It is not a NestJS port and makes no promise of drop-in migration compatibility. Every API decision optimizes for the long run on Bun.

**Non-goals:**
- Node.js compatibility
- NestJS drop-in replacement
- `reflect-metadata` / `emitDecoratorMetadata` support

---

## Package Structure

Single monorepo with Bun workspaces. Packages published under `@banhmi/*`.

```
banhmi/
  packages/
    common/         # Decorators, interfaces, exceptions, pipes (no HTTP deps)
    core/           # DI container, module system, application lifecycle
    platform-bun/   # Bun.serve adapter, radix-tree router, BanhmiFactory
    banhmi/        # Facade — re-exports common + core + platform-bun
    microservices/  # Transport layer — v2
    websockets/     # WebSocket gateway — v2
    testing/        # createTestingModule(), test utilities — v1.x
    config/         # ConfigModule with Standard Schema env validation — v1.x
  docs/
  examples/
```

Package dependency order: `common` ← `core` ← `platform-bun` ← `banhmi`

**Runtime:** Bun only.  
**Language:** TypeScript 5, TC39 Stage 3 decorators, `"moduleResolution": "bundler"`, `"strict": true`, `"noUncheckedIndexedAccess": true`.  
**Zero runtime dependencies** in `core` and `common`. `platform-bun` depends only on Bun built-ins.  
**Build:** `bun build --target=bun` per package, ESM output.  
**Versioning:** Changesets (`@changesets/cli`).  
**Linting/Formatting:** Biome.

Application entry point:
```ts
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './app.module'

const app = await BanhmiFactory.create(AppModule)
await app.listen(3000)
```

> **Note:** `BanhmiFactory` lives in `@banhmi/platform-bun` and is re-exported by the `banhmi` facade package. A 4th package `banhmi` (no scope) is added as a convenience facade.

---

## DI Container & Module System

### Dependency Injection

Uses TC39 Stage 3 decorators. `@Injectable()` attaches metadata to a class via a `Symbol`-keyed property — no `reflect-metadata`. Constructor dependencies are declared via a static `inject` token array:

```ts
@Injectable()
class CatsService {
  static inject = [CAT_REPO_TOKEN] as const
  constructor(private repo: CatRepository) {}
}
```

This eliminates `emitDecoratorMetadata` and works correctly with minification.

### Tokens

Typed symbols — no string tokens:

```ts
const CAT_REPO_TOKEN = Token<CatRepository>('CatRepository')
```

`Token<T>(description)` returns a symbol branded with phantom type `T`, giving compile-time type safety when injecting — the container infers the correct type from the token without needing an explicit type annotation.

### Modules

```ts
@Module({
  imports: [DatabaseModule],
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService],
})
class CatsModule {}
```

- `imports` — other modules whose exports become available to this module's providers
- `providers` — injectable classes or value/factory providers
- `controllers` — HTTP controllers registered in the router
- `exports` — providers made available to importing modules

**No `forwardRef`.** Circular dependencies are detected at bootstrap and throw a descriptive error. The module graph must be a DAG.

**Dynamic modules** via a static `register(options)` factory method returning `DynamicModule` — same pattern as NestJS.

### Provider Scopes

- **Singleton** (default) — one instance per application
- **Request** — one instance per HTTP request
- **Transient** — new instance per injection point

### Value & Factory Providers

```ts
{
  provide: DB_TOKEN,
  useValue: new Database(),
}

{
  provide: CONFIG_TOKEN,
  useFactory: (env: Env) => loadConfig(env),
  inject: [ENV_TOKEN],
}
```

---

## HTTP Layer & Routing

### Platform Adapter (`platform-bun`)

Wraps `Bun.serve`. Internally maintains a radix-tree router built from scratch. All routing operates on native Web Standard `Request` / `Response` — no Node.js `IncomingMessage` or `ServerResponse`.

### Controllers

```ts
@Controller('/cats')
class CatsController {
  static inject = [CatsService] as const
  constructor(private cats: CatsService) {}

  @Get('/:id')
  async findOne(@Param('id') id: string): Promise<Cat> {
    return this.cats.findById(id)
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateCatDto): Promise<Cat> {
    return this.cats.create(dto)
  }
}
```

**Route decorators:** `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Options`, `@Head`, `@All`.  
**Path parameters** support Express-style patterns (`:id`, `:id?`, `*`) via the radix router.

### Route Handler Context

TC39 Stage 3 decorators do not support parameter decorators. Instead, every route handler receives a single `RouteCtx` argument:

```ts
interface RouteCtx {
  readonly request: Request
  readonly params: Readonly<Record<string, string>>
  readonly query: URLSearchParams
  readonly headers: Headers
  readonly ip: string
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  formData(): Promise<FormData>
}
```

```ts
@Get('/:id')
async findOne(ctx: RouteCtx): Promise<Cat> {
  return this.cats.findById(ctx.params.id)
}

@Post()
async create(ctx: RouteCtx): Promise<Cat> {
  const dto = await ctx.json<CreateCatDto>()
  return this.cats.create(dto)
}
```

This is explicit, fully type-safe, and requires no metaprogramming. Validation is done by the user via their Standard Schema library (Zod, Valibot, etc.) directly in the handler, or globally via middleware.

### Response Handling

Handlers can return:
- A `Response` object — passed through as-is
- A plain value — serialized via `Response.json(value)` with `200`
- `void` / `undefined` — `204 No Content`

`@HttpCode(n)` overrides the default status code.  
`@Header(name, value)` sets a response header.  
`@Redirect(url, code?)` issues a redirect response.

### Middleware

Plain async functions in the `(req, next) => Promise<Response>` shape:

```ts
async function loggerMiddleware(
  req: Request,
  next: () => Promise<Response>,
): Promise<Response> {
  console.log(req.method, req.url)
  return next()
}
```

Applied via `app.use()` globally or `configure(consumer)` in modules (same as NestJS `MiddlewareConsumer`). Middleware runs before the enhancer pipeline.

---

## Enhancer Pipeline

Order of execution per request:

```
Middleware → Guards → Pipes (param extraction) → Interceptor (before) → Handler → Interceptor (after) → Exception Filters (on error)
```

### Guards

```ts
@Injectable()
class AuthGuard implements Guard {
  canActivate(ctx: ExecutionContext): boolean | Promise<boolean> {
    return ctx.getRequest().headers.get('authorization') !== null
  }
}
```

Return `false` or throw an `HttpException` to deny. Applied via `@UseGuards()`.

`ExecutionContext` exposes:
- `getRequest(): Request`
- `getHandler(): Function`
- `getClass(): Constructor`

### Pipes

Transform or validate handler arguments. Built-in:
- `ParseIntPipe` — coerces to integer, throws `BadRequestException` on failure
- `ParseUUIDPipe` — validates UUID format
- `ParseBoolPipe` — coerces `"true"/"false"` strings
- `ValidationPipe` — validates against a **Standard Schema**-compatible schema (Zod, Valibot, ArkType)

```ts
@Get('/:id')
findOne(@Param('id', ParseIntPipe) id: number) {}

@Post()
create(@Body(new ValidationPipe(CreateCatSchema)) dto: CreateCatDto) {}
```

No `class-validator` or `class-transformer` dependency.

### Interceptors

Wrap handler execution. No RxJS — `CallHandler.handle()` returns `Promise<Response>`:

```ts
@Injectable()
class LoggingInterceptor implements Interceptor {
  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Response> {
    const start = Date.now()
    const res = await next.handle()
    console.log(`${Date.now() - start}ms`)
    return res
  }
}
```

Applied via `@UseInterceptors()`.

### Exception Filters

Catch typed exceptions and produce a `Response`:

```ts
@Catch(NotFoundException)
class NotFoundFilter implements ExceptionFilter<NotFoundException> {
  catch(exception: NotFoundException, ctx: ExecutionContext): Response {
    return Response.json({ message: exception.message }, { status: 404 })
  }
}
```

A built-in `GlobalExceptionFilter` handles all unhandled exceptions:
- `HttpException` subclasses → correct status + structured JSON body
- Unknown errors → 500; message hidden in `Bun.env.NODE_ENV === 'production'`

Applied via `@UseFilters()` or `app.useGlobalFilters()`.

---

## Exception Classes

```
HttpException (base)
  ├── BadRequestException        400
  ├── UnauthorizedException      401
  ├── ForbiddenException         403
  ├── NotFoundException          404
  ├── MethodNotAllowedException  405
  ├── ConflictException          409
  ├── GoneException              410
  ├── UnprocessableEntityException 422
  ├── TooManyRequestsException   429
  └── InternalServerErrorException 500
```

`HttpException(message, statusCode, options?: { cause })` — `cause` is preserved for logging but not leaked to clients.

---

## Application Lifecycle

Lifecycle hook interfaces that providers/modules can implement:

| Hook | Trigger |
|------|---------|
| `OnModuleInit` | After all providers in the module are resolved |
| `OnApplicationBootstrap` | After HTTP server starts listening |
| `OnModuleDestroy` | On graceful shutdown, before server closes |
| `OnApplicationShutdown` | After all modules destroyed |

`app.enableShutdownHooks()` registers `SIGTERM` and `SIGINT` handlers for graceful shutdown.

---

## Configuration (v1.x — `@banhmi/config`)

`ConfigModule.forRoot({ schema })` validates `Bun.env` against a Standard Schema at application bootstrap. Throws a descriptive error if validation fails — fail fast, no silent misconfiguration.

```ts
const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
})

@Module({
  imports: [ConfigModule.forRoot({ schema: EnvSchema })],
})
class AppModule {}
```

`@InjectConfig()` injects the validated, typed config object into any provider.

For v1.0, users use `Bun.env` directly — typed via `/// <reference types="bun-types" />`.

---

## Testing (`@banhmi/testing` — v1.x)

Uses `bun test` as the runner. No Jest.

**`createTestingModule(metadata)`** — resolves the DI container without starting an HTTP server. Supports provider overrides for mocking:

```ts
const module = await createTestingModule({
  providers: [CatsService, { provide: CAT_REPO_TOKEN, useValue: mockRepo }],
}).compile()

const service = module.get(CatsService)
```

**`createTestingApp(metadata)`** — full application on a random ephemeral port. Useful for integration tests that fire real HTTP requests.

---

## Roadmap

### v2 — WebSockets (`@banhmi/websockets`)

- `@WebSocketGateway(path?)` — registers a WS endpoint on `Bun.serve`'s native WebSocket upgrade
- `@SubscribeMessage(event)` — handler for a named message event
- Same guard/interceptor pipeline applies to WS messages
- `@ConnectedSocket()` / `@MessageBody()` parameter decorators

### v2 — Microservices (`@banhmi/microservices`)

- `ClientProxy` / `Server` transport pattern from NestJS
- Built-in transports using Bun native clients:
  - `BunRedisTransport` → `Bun.redis`
  - `BunSQLTransport` → `Bun.sql`
  - `TcpTransport` → Bun TCP sockets
- `@MessagePattern()` / `@EventPattern()` for routing
- Hybrid apps (HTTP + microservice on same process) supported

### v1.x — CLI (`@banhmi/cli`)

- `bunx banhmi new <project>` — scaffold a new project
- `bunx banhmi generate <schematic> <name>` — controller, module, service, guard, pipe, interceptor, filter
- Ships after core stabilizes

---

## Conventions & Tooling

- Monorepo managed with **Bun workspaces**
- Each package built with `bun build --target=bun`, ESM output
- Strict TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Tests in `packages/*/test/`, run with `bun test`
- Versioning via **Changesets**
- Formatting/linting via **Biome**
- CI: GitHub Actions running `bun test` across all packages
