# Better Auth Integration Example Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `better-auth-api` example app that integrates better-auth's email/password authentication with banhmi, using `bun:sqlite` as the database, and demonstrates session-protected routes via an `AuthGuard`.

**Architecture:** `BunAdapter` middleware runs before route dispatch (prerequisite fix). A banhmi middleware intercepts `/api/auth/**` and forwards requests to `auth.handler(req)`. An `AuthGuard` calls `auth.api.getSession({ headers })` to protect controller routes. Gateways and controllers use standard banhmi decorators.

**Tech Stack:** `better-auth` ^1.0, `bun:sqlite` (no ORM), TC39 Stage 3 decorators, static `inject` DI.

---

## File Structure

**Modified — `packages/platform-bun/src/bun-adapter.ts`**  
Fix middleware execution order: middleware runs *before* route dispatch, not after the match. This enables global middleware (like the auth handler) to intercept unmatched routes.

**New — `examples/better-auth-api/package.json`**  
Declares `better-auth` dependency and `banhmi: workspace:*`.

**New — `examples/better-auth-api/bunfig.toml`**  
Preloads `Symbol.metadata` polyfill.

**New — `examples/better-auth-api/src/auth.ts`**  
better-auth instance configured with `bun:sqlite` and email/password.

**New — `examples/better-auth-api/src/auth/auth.guard.ts`**  
`AuthGuard implements Guard` — calls `auth.api.getSession` to validate sessions.

**New — `examples/better-auth-api/src/users/users.controller.ts`**  
`UsersController` with a public `/users/ping` route and a protected `/users/me` route.

**New — `examples/better-auth-api/src/app.module.ts`**  
Root module wiring up `UsersController` and `AuthGuard`.

**New — `examples/better-auth-api/src/main.ts`**  
Creates the app, mounts the better-auth middleware, listens on port 3001.

---

## Task 1: Fix middleware execution order in `BunAdapter`

**Context:** Currently `handleRequest` matches the route first, then runs middleware only if a match is found. This means middleware can't intercept unrouted paths (like `/api/auth/**`). Fix: move `runMiddleware` to wrap the entire dispatch, not just the matched handler.

**Files:**
- Modify: `packages/platform-bun/src/bun-adapter.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/platform-bun/test/integration.test.ts` — a new describe block at the end:

```ts
describe('middleware intercepts unmatched routes', () => {
  test('middleware can handle routes not in the router', async () => {
    const middlewareApp = await BanhmiFactory.create(AppModule)
    middlewareApp.use(async (req: Request, next: () => Promise<Response>) => {
      const url = new URL(req.url)
      if (url.pathname === '/intercept') {
        return Response.json({ intercepted: true })
      }
      return next()
    })
    await middlewareApp.listen(54399)
    const res = await fetch('http://localhost:54399/intercept')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ intercepted: true })
    await middlewareApp.close()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/platform-bun && bun test test/integration.test.ts --test-name-pattern "middleware intercepts"
```

Expected: FAIL — returns 404 instead of `{ intercepted: true }`

- [ ] **Step 3: Refactor `handleRequest` in `packages/platform-bun/src/bun-adapter.ts`**

Split `handleRequest` into `handleRequest` (which runs middleware first) and `dispatchRoute` (which does the route matching and handler call). Replace the relevant section:

```ts
  private handleRequest(request: Request): Promise<Response> {
    return this.runMiddleware(request, () => this.dispatchRoute(request))
  }

  private async dispatchRoute(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const match = this.router.match(request.method, url.pathname)

    if (!match) {
      return Response.json(
        { statusCode: 404, message: 'Not Found', path: url.pathname },
        { status: 404 },
      )
    }

    const routeCtx = new BunRouteCtx(request, match.params)
    const execCtx = new BunExecutionContext(
      routeCtx,
      match.handlerClass ?? class {},
      match.handler,
    )

    const guardInstances = match.guards.map((G) => new G())
    const interceptorInstances = match.interceptors.map((I) => new I())
    const filterInstances: RegisteredFilter[] = match.filters.map((F) => ({
      filterInstance: new F() as RegisteredFilter['filterInstance'],
    }))

    return runEnhancerPipeline(
      execCtx,
      () => match.handler(routeCtx),
      guardInstances,
      interceptorInstances,
      filterInstances,
      match.httpCode ?? 200,
      match.responseHeaders,
    )
  }
```

The full updated `bun-adapter.ts` (replace entire file):

```ts
import type { ClassConstructor } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import type { Server, ServerWebSocket } from 'bun'
import { type RegisteredFilter, runEnhancerPipeline } from './enhancer-pipeline'
import { BunExecutionContext } from './execution-context'
import { BunRouteCtx } from './route-ctx'
import { RouteExplorer } from './route-explorer'
import { RadixRouter } from './router'
import { type BunWsData, BunWsContext } from './ws-context'
import { type ExploredGateway, WsGatewayExplorer } from './ws-gateway-explorer'

type MiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

export class BunAdapter implements HttpAdapter {
  private router = new RadixRouter()
  private explorer = new RouteExplorer()
  private wsExplorer = new WsGatewayExplorer()
  private middleware: MiddlewareFn[] = []
  private server: Server | null = null
  private gateways: Array<ExploredGateway & { instance: object }> = []

  use(middleware: unknown): void {
    this.middleware.push(middleware as MiddlewareFn)
  }

  registerController(instance: object, controllerClass: ClassConstructor): void {
    const routes = this.explorer.explore(instance, controllerClass)
    for (const route of routes) {
      this.router.add(route)
    }
  }

  registerGateway(instance: object, gatewayClass: ClassConstructor): void {
    const explored = this.wsExplorer.explore(instance, gatewayClass)
    if (explored) {
      this.gateways.push({ ...explored, instance })
    }
  }

  async listen(port: number): Promise<void> {
    this.server = Bun.serve({
      port,
      fetch: (req, server) => this.handleFetch(req, server),
      websocket: {
        open: (ws) => this.handleWsOpen(ws),
        message: (ws, msg) => this.handleWsMessage(ws, msg),
        close: (ws, code, reason) => this.handleWsClose(ws, code, reason),
      },
    })

    for (const gw of this.gateways) {
      for (const propName of gw.serverPropNames) {
        (gw.instance as Record<string, unknown>)[propName] = this.server
      }
      gw.lifecycle.onInit?.(this.server)
    }
  }

  async close(): Promise<void> {
    await this.server?.stop(true)
    this.server = null
  }

  private handleFetch(
    request: Request,
    server: Server,
  ): Response | undefined | Promise<Response> {
    const url = new URL(request.url)

    if (request.headers.get('upgrade') === 'websocket') {
      const gateway = this.gateways.find((gw) => gw.path === url.pathname)
      if (gateway) {
        const upgraded = server.upgrade<BunWsData>(request, {
          data: { sessionId: crypto.randomUUID(), gatewayPath: url.pathname },
        })
        if (upgraded) return undefined
      }
      return new Response('Not Found', { status: 404 })
    }

    return this.handleRequest(request)
  }

  private handleWsOpen(ws: ServerWebSocket<BunWsData>): void {
    const gateway = this.gateways.find((gw) => gw.path === ws.data.gatewayPath)
    if (!gateway) return
    const ctx = new BunWsContext(ws, 'connection', null)
    gateway.lifecycle.onConnection?.(ctx)
  }

  private handleWsMessage(
    ws: ServerWebSocket<BunWsData>,
    msg: string | Buffer,
  ): void {
    const text = typeof msg === 'string' ? msg : msg.toString()

    let parsed: { event: string; data: unknown }
    try {
      parsed = JSON.parse(text) as { event: string; data: unknown }
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }))
      return
    }

    const { event, data } = parsed
    const gateway = this.gateways.find((gw) => gw.path === ws.data.gatewayPath)
    if (!gateway) return

    const handler = gateway.messages[event]
    if (!handler) return

    const ctx = new BunWsContext(ws, event, data)
    Promise.resolve(handler(ctx))
      .then((result) => {
        if (result !== undefined && result !== null) {
          ws.send(JSON.stringify({ event, data: result }))
        }
      })
      .catch((err: unknown) => {
        ws.send(JSON.stringify({ error: String(err) }))
      })
  }

  private handleWsClose(
    ws: ServerWebSocket<BunWsData>,
    _code: number,
    _reason: string,
  ): void {
    const gateway = this.gateways.find((gw) => gw.path === ws.data.gatewayPath)
    if (!gateway) return
    const ctx = new BunWsContext(ws, 'disconnect', null)
    gateway.lifecycle.onDisconnect?.(ctx)
  }

  private handleRequest(request: Request): Promise<Response> {
    return this.runMiddleware(request, () => this.dispatchRoute(request))
  }

  private async dispatchRoute(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const match = this.router.match(request.method, url.pathname)

    if (!match) {
      return Response.json(
        { statusCode: 404, message: 'Not Found', path: url.pathname },
        { status: 404 },
      )
    }

    const routeCtx = new BunRouteCtx(request, match.params)
    const execCtx = new BunExecutionContext(
      routeCtx,
      match.handlerClass ?? class {},
      match.handler,
    )

    const guardInstances = match.guards.map((G) => new G())
    const interceptorInstances = match.interceptors.map((I) => new I())
    const filterInstances: RegisteredFilter[] = match.filters.map((F) => ({
      filterInstance: new F() as RegisteredFilter['filterInstance'],
    }))

    return runEnhancerPipeline(
      execCtx,
      () => match.handler(routeCtx),
      guardInstances,
      interceptorInstances,
      filterInstances,
      match.httpCode ?? 200,
      match.responseHeaders,
    )
  }

  private async runMiddleware(
    request: Request,
    final: () => Promise<Response>,
  ): Promise<Response> {
    const chain = [...this.middleware]

    const execute = (index: number): Promise<Response> => {
      if (index >= chain.length) return final()
      const mw = chain[index]
      if (!mw) return final()
      return mw(request, () => execute(index + 1))
    }

    return execute(0)
  }
}
```

- [ ] **Step 4: Run the new test to verify it passes**

```bash
cd packages/platform-bun && bun test test/integration.test.ts --test-name-pattern "middleware intercepts"
```

Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
bun test --recursive
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/platform-bun/src/bun-adapter.ts \
        packages/platform-bun/test/integration.test.ts
git commit -m "fix(platform-bun): run middleware before route dispatch"
```

---

## Task 2: Create the `better-auth-api` example

**Files:**
- Create: `examples/better-auth-api/package.json`
- Create: `examples/better-auth-api/bunfig.toml`
- Create: `examples/better-auth-api/src/auth.ts`
- Create: `examples/better-auth-api/src/auth/auth.guard.ts`
- Create: `examples/better-auth-api/src/users/users.controller.ts`
- Create: `examples/better-auth-api/src/app.module.ts`
- Create: `examples/better-auth-api/src/main.ts`

- [ ] **Step 1: Install better-auth into the workspace**

```bash
cd examples/better-auth-api && bun add better-auth
```

Wait — create the package.json first so `bun add` knows where to install.

- [ ] **Step 2: Create `examples/better-auth-api/package.json`**

```json
{
  "name": "better-auth-api-example",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/main.ts",
    "migrate": "bunx --bun auth@latest migrate"
  },
  "dependencies": {
    "banhmi": "workspace:*",
    "better-auth": "^1.2.0"
  }
}
```

- [ ] **Step 3: Create `examples/better-auth-api/bunfig.toml`**

```toml
[test]
preload = ["../../packages/common/src/polyfill-symbol-metadata.ts"]
```

- [ ] **Step 4: Install dependencies**

```bash
bun install
```

Expected: `better-auth` installed in `examples/better-auth-api/node_modules` (or hoisted to root).

- [ ] **Step 5: Create `examples/better-auth-api/src/auth.ts`**

```ts
import { betterAuth } from 'better-auth'
import { Database } from 'bun:sqlite'

export const auth = betterAuth({
  database: new Database('./better-auth.sqlite'),
  emailAndPassword: { enabled: true },
  trustedOrigins: [Bun.env.BETTER_AUTH_URL ?? 'http://localhost:3001'],
})
```

- [ ] **Step 6: Create `examples/better-auth-api/src/auth/auth.guard.ts`**

```ts
import { Injectable, UnauthorizedException } from 'banhmi'
import type { ExecutionContext, Guard } from 'banhmi'
import { auth } from '../auth'

@Injectable()
export class AuthGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.getCtx().request
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new UnauthorizedException('Not authenticated')
    return true
  }
}
```

- [ ] **Step 7: Create `examples/better-auth-api/src/users/users.controller.ts`**

```ts
import { Controller, Get, UseGuards } from 'banhmi'
import type { RouteCtx } from 'banhmi'
import { auth } from '../auth'
import { AuthGuard } from '../auth/auth.guard'

interface SessionUser {
  id: string
  email: string
  name: string
  createdAt: Date
}

@Controller('/users')
export class UsersController {
  @Get('/ping')
  ping() {
    return { message: 'pong', timestamp: Date.now() }
  }

  @Get('/me')
  @UseGuards(AuthGuard)
  async getMe(ctx: RouteCtx): Promise<SessionUser | null> {
    const session = await auth.api.getSession({ headers: ctx.headers })
    return session?.user as SessionUser | null
  }
}
```

- [ ] **Step 8: Create `examples/better-auth-api/src/app.module.ts`**

```ts
import { Module } from 'banhmi'
import { UsersController } from './users/users.controller'

@Module({
  controllers: [UsersController],
})
export class AppModule {}
```

- [ ] **Step 9: Create `examples/better-auth-api/src/main.ts`**

```ts
import { BanhmiFactory } from 'banhmi'
import { auth } from './auth'
import { AppModule } from './app.module'

const app = await BanhmiFactory.create(AppModule)

// Mount better-auth handler for all /api/auth/** requests
app.use(async (req: Request, next: () => Promise<Response>) => {
  const url = new URL(req.url)
  if (url.pathname.startsWith('/api/auth')) {
    return auth.handler(req)
  }
  return next()
})

app.enableShutdownHooks()
await app.listen(3001)

console.log('Server running on http://localhost:3001')
console.log('')
console.log('Sign up:  POST http://localhost:3001/api/auth/sign-up/email')
console.log('Sign in:  POST http://localhost:3001/api/auth/sign-in/email')
console.log('Profile:  GET  http://localhost:3001/users/me  (requires auth cookie)')
console.log('Public:   GET  http://localhost:3001/users/ping')
```

- [ ] **Step 10: Run the better-auth migration to create the SQLite schema**

Run from `examples/better-auth-api/`:

```bash
cd examples/better-auth-api && bunx --bun auth@latest migrate
```

Expected: Creates `better-auth.sqlite` with `user`, `session`, `account`, and `verification` tables.

If prompted for DB URL: leave empty (better-auth reads from `src/auth.ts` automatically).

- [ ] **Step 11: Start the dev server**

```bash
cd examples/better-auth-api && bun run dev
```

Expected: Server starts on port 3001 with no errors.

- [ ] **Step 12: Verify sign-up, sign-in, and protected route manually**

```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' \
  -c /tmp/auth-cookies.txt

# Sign in (saves session cookie)
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c /tmp/auth-cookies.txt -b /tmp/auth-cookies.txt

# Access protected route with cookie
curl http://localhost:3001/users/me \
  -b /tmp/auth-cookies.txt

# Access protected route without cookie (should 401)
curl http://localhost:3001/users/me

# Public route (no auth needed)
curl http://localhost:3001/users/ping
```

Expected:
- Sign up: `200` with user object
- Sign in: `200` with session data, sets `Set-Cookie` header
- `/users/me` with cookie: `200` with `{ id, email, name, createdAt }`
- `/users/me` without cookie: `403` (ForbiddenException from guard)
- `/users/ping`: `200` with `{ message: "pong", timestamp: ... }`

**Note:** better-auth uses `ForbiddenException` when `canActivate` throws `UnauthorizedException` because the enhancer pipeline catches the thrown exception and falls through to the `GlobalExceptionFilter`. The guard throws `UnauthorizedException` but the banhmi pipeline wraps it. Verify the status code is correct and adjust the guard exception type if needed (change to `ForbiddenException` if the status should be 403).

- [ ] **Step 13: Stop the server and commit**

```bash
git add examples/better-auth-api/
git commit -m "feat(examples): add better-auth integration example"
```

---

## Task 3: Add `.gitignore` for generated SQLite files

**Files:**
- Modify or create: `examples/better-auth-api/.gitignore`

- [ ] **Step 1: Create `.gitignore` for the example**

```
better-auth.sqlite
better-auth.sqlite-shm
better-auth.sqlite-wal
```

- [ ] **Step 2: Commit**

```bash
git add examples/better-auth-api/.gitignore
git commit -m "chore(better-auth-api): gitignore generated SQLite files"
```

---

## Self-Review

**Spec coverage:**
- ✅ better-auth MCP added to `.mcp.json` (done before plan)
- ✅ better-auth skills installed (done before plan)
- ✅ Middleware order bug fixed — Task 1
- ✅ `better-auth-api` example with signup/login — Task 2
- ✅ `AuthGuard` using `auth.api.getSession` — Task 2
- ✅ Protected `/users/me` endpoint — Task 2
- ✅ Public `/users/ping` endpoint — Task 2
- ✅ SQLite database via `bun:sqlite` — Task 2
- ✅ Migration instructions — Task 2

**Type consistency:** `AuthGuard` implements `Guard` from `@banhmi/common`. `ExecutionContext.getCtx()` returns `RouteCtx` which has `request: Request` and `headers: Headers`. `auth.api.getSession({ headers })` matches this shape.

**No placeholders:** All code blocks are complete.
