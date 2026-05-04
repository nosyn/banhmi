# WebSocket Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WebSocket gateway support via `@WebSocketGateway`, `@SubscribeMessage`, and `@WebSocketServer` decorators using `Bun.serve`'s native WebSocket handler.

**Architecture:** Decorators and interfaces live in `@banhmi/common`; `WsGatewayExplorer` + `BunWsContext` live in `@banhmi/platform-bun`; `BunAdapter` is extended to handle WebSocket upgrades and message routing on the same port as HTTP. Gateways are registered as DI providers so they support constructor injection. The message protocol is `{ event: string, data: unknown }` JSON over the WebSocket.

**Tech Stack:** Bun native WebSockets (`Bun.serve` + `ServerWebSocket`), TC39 Stage 3 decorators, `Symbol.metadata`, static `inject` DI.

---

## File Structure

**Modified — `packages/common/src/metadata-keys.ts`**  
Add three new symbols: `WS_GATEWAY_METADATA`, `WS_MESSAGE_METADATA`, `WS_SERVER_PROPERTY_METADATA`.

**New — `packages/common/src/interfaces/ws-context.ts`**  
`WsContext` interface + lifecycle interfaces `OnGatewayInit`, `OnGatewayConnection`, `OnGatewayDisconnect`.

**New — `packages/common/src/decorators/websocket.ts`**  
`@WebSocketGateway(options?)`, `@SubscribeMessage(event)`, `@WebSocketServer()` decorators.

**Modified — `packages/common/src/interfaces/module-metadata.ts`**  
Add `gateways?: ClassConstructor[]` to `ModuleMetadata`.

**Modified — `packages/common/src/index.ts`**  
Re-export new decorator/interface/types.

**New — `packages/platform-bun/src/ws-context.ts`**  
`BunWsData` type + `BunWsContext implements WsContext`.

**New — `packages/platform-bun/src/ws-gateway-explorer.ts`**  
`WsGatewayExplorer.explore()` — reads WS metadata, returns message handlers and lifecycle hooks.

**Modified — `packages/platform-bun/src/bun-adapter.ts`**  
Add `registerGateway()`, WS upgrade routing in `handleFetch()`, `handleWsOpen/Message/Close()` handlers. Update `Bun.serve` call to include `websocket:` block.

**Modified — `packages/platform-bun/src/index.ts`**  
Export `BunWsContext`, `WsGatewayExplorer`.

**Modified — `packages/core/src/module-graph.ts`**  
Add `gateways` field to `ModuleNode`. Include gateways in `flattenModuleProviders`. Populate from `meta.gateways` in `buildTree`.

**Modified — `packages/core/src/application.ts`**  
Add optional `registerGateway?` to `HttpAdapter` interface. Add `flattenGateways()` private method. Call `adapter.registerGateway?.(instance, gw)` in `listen()`.

**New — `packages/platform-bun/test/websocket.test.ts`**  
Integration tests: connect, ping/pong, echo, disconnect lifecycle.

**Modified — `examples/cats-api/src/main.ts` + new `examples/cats-api/src/events/events.gateway.ts`**  
Add a demo `EventsGateway` to the cats-api example.

---

## Task 1: WS metadata keys, interfaces, and decorators in `@banhmi/common`

**Files:**
- Modify: `packages/common/src/metadata-keys.ts`
- Create: `packages/common/src/interfaces/ws-context.ts`
- Create: `packages/common/src/decorators/websocket.ts`
- Modify: `packages/common/src/interfaces/module-metadata.ts`
- Modify: `packages/common/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/common/test/websocket-decorators.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '../src/decorators/websocket'
import {
  WS_GATEWAY_METADATA,
  WS_MESSAGE_METADATA,
  WS_SERVER_PROPERTY_METADATA,
} from '../src/metadata-keys'

describe('@WebSocketGateway', () => {
  test('stores gateway metadata with default path', () => {
    @WebSocketGateway()
    class TestGateway {}

    const meta = TestGateway[Symbol.metadata] as Record<symbol, unknown>
    expect(meta[WS_GATEWAY_METADATA]).toEqual({ path: '/ws' })
  })

  test('stores gateway metadata with custom path', () => {
    @WebSocketGateway({ path: '/chat' })
    class TestGateway {}

    const meta = TestGateway[Symbol.metadata] as Record<symbol, unknown>
    expect(meta[WS_GATEWAY_METADATA]).toEqual({ path: '/chat' })
  })
})

describe('@SubscribeMessage', () => {
  test('maps event names to method names', () => {
    class TestGateway {
      @SubscribeMessage('ping')
      handlePing() {}

      @SubscribeMessage('chat')
      handleChat() {}
    }

    const meta = TestGateway[Symbol.metadata] as Record<symbol, unknown>
    expect(meta[WS_MESSAGE_METADATA]).toEqual({ ping: 'handlePing', chat: 'handleChat' })
  })
})

describe('@WebSocketServer', () => {
  test('stores property names in metadata', () => {
    class TestGateway {
      @WebSocketServer()
      server: unknown
    }

    const meta = TestGateway[Symbol.metadata] as Record<symbol, unknown>
    expect(meta[WS_SERVER_PROPERTY_METADATA]).toEqual(['server'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/common && bun test test/websocket-decorators.test.ts
```

Expected: FAIL — `Cannot find module '../src/decorators/websocket'`

- [ ] **Step 3: Add the three new metadata symbols to `packages/common/src/metadata-keys.ts`**

```ts
export const INJECTABLE_WATERMARK = Symbol('banhmi:injectable')
export const MODULE_METADATA = Symbol('banhmi:module')
export const CONTROLLER_METADATA = Symbol('banhmi:controller')
export const ROUTE_METADATA = Symbol('banhmi:routes')
export const HTTP_CODE_METADATA = Symbol('banhmi:http_code')
export const RESPONSE_HEADERS_METADATA = Symbol('banhmi:response_headers')
export const REDIRECT_METADATA = Symbol('banhmi:redirect')
export const GUARDS_METADATA = Symbol('banhmi:guards')
export const INTERCEPTORS_METADATA = Symbol('banhmi:interceptors')
export const FILTERS_METADATA = Symbol('banhmi:filters')
export const PIPES_METADATA = Symbol('banhmi:pipes')
export const CUSTOM_ROUTE_METADATA = Symbol('banhmi:custom_metadata')
export const WS_GATEWAY_METADATA = Symbol('banhmi:ws_gateway')
export const WS_MESSAGE_METADATA = Symbol('banhmi:ws_messages')
export const WS_SERVER_PROPERTY_METADATA = Symbol('banhmi:ws_server_prop')
```

- [ ] **Step 4: Create `packages/common/src/interfaces/ws-context.ts`**

```ts
export interface WsContext {
  readonly event: string
  readonly data: unknown
  send(data: string | ArrayBuffer | Uint8Array): number
  subscribe(topic: string): void
  unsubscribe(topic: string): void
  publish(topic: string, data: string): number
  close(code?: number, reason?: string): void
  readonly remoteAddress: string
}

export interface OnGatewayInit {
  afterInit(server: unknown): void
}

export interface OnGatewayConnection {
  handleConnection(ctx: WsContext): void
}

export interface OnGatewayDisconnect {
  handleDisconnect(ctx: WsContext): void
}
```

- [ ] **Step 5: Create `packages/common/src/decorators/websocket.ts`**

```ts
import {
  WS_GATEWAY_METADATA,
  WS_MESSAGE_METADATA,
  WS_SERVER_PROPERTY_METADATA,
} from '../metadata-keys'

export interface WsGatewayOptions {
  path?: string
}

export interface WsGatewayMetadata {
  path: string
}

export function WebSocketGateway(options: WsGatewayOptions = {}) {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[WS_GATEWAY_METADATA] = {
      path: options.path ?? '/ws',
    } satisfies WsGatewayMetadata
  }
}

export function SubscribeMessage(event: string) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const existing =
      (context.metadata[WS_MESSAGE_METADATA] as Record<string, string> | undefined) ?? {}
    context.metadata[WS_MESSAGE_METADATA] = {
      ...existing,
      [event]: context.name as string,
    }
  }
}

export function WebSocketServer() {
  return (_target: unknown, context: ClassFieldDecoratorContext): void => {
    const existing =
      (context.metadata[WS_SERVER_PROPERTY_METADATA] as string[] | undefined) ?? []
    context.metadata[WS_SERVER_PROPERTY_METADATA] = [
      ...existing,
      context.name as string,
    ]
  }
}
```

- [ ] **Step 6: Add `gateways` to `ModuleMetadata` in `packages/common/src/interfaces/module-metadata.ts`**

```ts
import type { Token } from '../token'

export type ClassConstructor<T = unknown> = new (...args: unknown[]) => T
export type AbstractConstructor<T = unknown> = abstract new (
  ...args: unknown[]
) => T
export type InjectToken<T = unknown> = Token<T> | ClassConstructor<T>

export type ValueProvider<T> = {
  provide: Token<T>
  useValue: T
}

export type FactoryProvider<T> = {
  provide: Token<T>
  useFactory: (...args: unknown[]) => T | Promise<T>
  inject?: InjectToken[]
}

export type ProviderDef<T = unknown> =
  | ClassConstructor<T>
  | ValueProvider<T>
  | FactoryProvider<T>

export interface ModuleMetadata {
  imports?: AbstractConstructor[]
  controllers?: ClassConstructor[]
  gateways?: ClassConstructor[]
  providers?: ProviderDef[]
  exports?: InjectToken[]
}
```

- [ ] **Step 7: Re-export from `packages/common/src/index.ts`**

Add to the existing `index.ts` (append after the Pipes section):

```ts
// WebSockets
export { WebSocketGateway, SubscribeMessage, WebSocketServer } from './decorators/websocket'
export type { WsGatewayOptions, WsGatewayMetadata } from './decorators/websocket'
export type {
  WsContext,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from './interfaces/ws-context'
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd packages/common && bun test test/websocket-decorators.test.ts
```

Expected: PASS — 5 tests pass

- [ ] **Step 9: Run full common test suite**

```bash
cd packages/common && bun test
```

Expected: all existing tests still pass

- [ ] **Step 10: Commit**

```bash
git add packages/common/src/metadata-keys.ts \
        packages/common/src/interfaces/ws-context.ts \
        packages/common/src/decorators/websocket.ts \
        packages/common/src/interfaces/module-metadata.ts \
        packages/common/src/index.ts \
        packages/common/test/websocket-decorators.test.ts
git commit -m "feat(common): add WebSocket gateway decorators and interfaces"
```

---

## Task 2: `BunWsContext` and `WsGatewayExplorer` in `@banhmi/platform-bun`

**Files:**
- Create: `packages/platform-bun/src/ws-context.ts`
- Create: `packages/platform-bun/src/ws-gateway-explorer.ts`
- Create: `packages/platform-bun/test/ws-gateway-explorer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/platform-bun/test/ws-gateway-explorer.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import {
  Injectable,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@banhmi/common'
import type { WsContext } from '@banhmi/common'
import { WsGatewayExplorer } from '../src/ws-gateway-explorer'

@WebSocketGateway({ path: '/chat' })
@Injectable()
class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: unknown

  afterInit(_server: unknown): void {}
  handleConnection(_ctx: WsContext): void {}
  handleDisconnect(_ctx: WsContext): void {}

  @SubscribeMessage('ping')
  handlePing(_ctx: WsContext): { pong: string } {
    return { pong: 'ok' }
  }

  @SubscribeMessage('echo')
  handleEcho(ctx: WsContext): unknown {
    return ctx.data
  }
}

describe('WsGatewayExplorer', () => {
  const explorer = new WsGatewayExplorer()
  const instance = new ChatGateway()
  const explored = explorer.explore(instance, ChatGateway)

  test('returns null for non-gateway class', () => {
    class Plain {}
    expect(explorer.explore(new Plain(), Plain)).toBeNull()
  })

  test('extracts gateway path', () => {
    expect(explored?.path).toBe('/chat')
  })

  test('extracts message handlers', () => {
    expect(Object.keys(explored?.messages ?? {})).toEqual(['ping', 'echo'])
  })

  test('extracts server property names', () => {
    expect(explored?.serverPropNames).toEqual(['server'])
  })

  test('detects lifecycle: onInit', () => {
    expect(explored?.lifecycle.onInit).toBeFunction()
  })

  test('detects lifecycle: onConnection', () => {
    expect(explored?.lifecycle.onConnection).toBeFunction()
  })

  test('detects lifecycle: onDisconnect', () => {
    expect(explored?.lifecycle.onDisconnect).toBeFunction()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/platform-bun && bun test test/ws-gateway-explorer.test.ts
```

Expected: FAIL — `Cannot find module '../src/ws-gateway-explorer'`

- [ ] **Step 3: Create `packages/platform-bun/src/ws-context.ts`**

```ts
import type { WsContext } from '@banhmi/common'
import type { ServerWebSocket } from 'bun'

export interface BunWsData {
  sessionId: string
  gatewayPath: string
}

export class BunWsContext implements WsContext {
  constructor(
    private readonly ws: ServerWebSocket<BunWsData>,
    readonly event: string,
    readonly data: unknown,
  ) {}

  send(data: string | ArrayBuffer | Uint8Array): number {
    return this.ws.send(data)
  }

  subscribe(topic: string): void {
    this.ws.subscribe(topic)
  }

  unsubscribe(topic: string): void {
    this.ws.unsubscribe(topic)
  }

  publish(topic: string, data: string): number {
    return this.ws.publish(topic, data)
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason)
  }

  get remoteAddress(): string {
    return this.ws.remoteAddress
  }
}
```

- [ ] **Step 4: Create `packages/platform-bun/src/ws-gateway-explorer.ts`**

```ts
import type {
  ClassConstructor,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsContext,
  WsGatewayMetadata,
} from '@banhmi/common'
import {
  WS_GATEWAY_METADATA,
  WS_MESSAGE_METADATA,
  WS_SERVER_PROPERTY_METADATA,
} from '@banhmi/common'

export interface ExploredGateway {
  path: string
  messages: Record<string, (ctx: WsContext) => unknown>
  lifecycle: {
    onInit?: (server: unknown) => void
    onConnection?: (ctx: WsContext) => void
    onDisconnect?: (ctx: WsContext) => void
  }
  serverPropNames: string[]
}

export class WsGatewayExplorer {
  explore(instance: object, gatewayClass: ClassConstructor): ExploredGateway | null {
    const classMeta = gatewayClass[Symbol.metadata] as Record<symbol, unknown> | null
    if (!classMeta) return null

    const gatewayMeta = classMeta[WS_GATEWAY_METADATA] as WsGatewayMetadata | undefined
    if (!gatewayMeta) return null

    const messageMap =
      (classMeta[WS_MESSAGE_METADATA] as Record<string, string> | undefined) ?? {}
    const serverPropNames =
      (classMeta[WS_SERVER_PROPERTY_METADATA] as string[] | undefined) ?? []

    const messages: Record<string, (ctx: WsContext) => unknown> = {}
    for (const [event, methodName] of Object.entries(messageMap)) {
      const fn = (instance as Record<string, unknown>)[methodName]
      if (typeof fn === 'function') {
        messages[event] = (ctx) =>
          (fn as (ctx: WsContext) => unknown).call(instance, ctx)
      }
    }

    const lifecycle: ExploredGateway['lifecycle'] = {}

    if (
      'afterInit' in instance &&
      typeof (instance as OnGatewayInit).afterInit === 'function'
    ) {
      lifecycle.onInit = (server) => (instance as OnGatewayInit).afterInit(server)
    }
    if (
      'handleConnection' in instance &&
      typeof (instance as OnGatewayConnection).handleConnection === 'function'
    ) {
      lifecycle.onConnection = (ctx) =>
        (instance as OnGatewayConnection).handleConnection(ctx)
    }
    if (
      'handleDisconnect' in instance &&
      typeof (instance as OnGatewayDisconnect).handleDisconnect === 'function'
    ) {
      lifecycle.onDisconnect = (ctx) =>
        (instance as OnGatewayDisconnect).handleDisconnect(ctx)
    }

    return { path: gatewayMeta.path, messages, lifecycle, serverPropNames }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/platform-bun && bun test test/ws-gateway-explorer.test.ts
```

Expected: PASS — 7 tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/platform-bun/src/ws-context.ts \
        packages/platform-bun/src/ws-gateway-explorer.ts \
        packages/platform-bun/test/ws-gateway-explorer.test.ts
git commit -m "feat(platform-bun): add BunWsContext and WsGatewayExplorer"
```

---

## Task 3: Update `BunAdapter` for WebSocket support

**Files:**
- Modify: `packages/platform-bun/src/bun-adapter.ts`
- Modify: `packages/platform-bun/src/index.ts`

No new tests in this task — integration tests are in Task 5.

- [ ] **Step 1: Replace `packages/platform-bun/src/bun-adapter.ts` with the WS-capable version**

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

  private async handleRequest(request: Request): Promise<Response> {
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

    const dispatchToHandler = () =>
      runEnhancerPipeline(
        execCtx,
        () => match.handler(routeCtx),
        guardInstances,
        interceptorInstances,
        filterInstances,
        match.httpCode ?? 200,
        match.responseHeaders,
      )

    return this.runMiddleware(request, dispatchToHandler)
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

- [ ] **Step 2: Update `packages/platform-bun/src/index.ts` to export new types**

```ts
export { BunAdapter } from './bun-adapter'
export { BunExecutionContext } from './execution-context'
export { BanhmiFactory } from './factory'
export { GlobalExceptionFilter } from './global-filter'
export { RadixRouter } from './router'
export type { MatchResult, RegisteredRoute } from './router'
export { BunRouteCtx } from './route-ctx'
export { RouteExplorer } from './route-explorer'
export { BunWsContext } from './ws-context'
export type { BunWsData } from './ws-context'
export { WsGatewayExplorer } from './ws-gateway-explorer'
export type { ExploredGateway } from './ws-gateway-explorer'
```

- [ ] **Step 3: Run lint**

```bash
bun run lint
```

Expected: no errors. If Biome reports `useArrowFunction`, run `bun run format` to auto-fix.

- [ ] **Step 4: Commit**

```bash
git add packages/platform-bun/src/bun-adapter.ts \
        packages/platform-bun/src/index.ts
git commit -m "feat(platform-bun): add WebSocket gateway support to BunAdapter"
```

---

## Task 4: Update `ModuleGraph` and `BanhmiApplication` for gateways

**Files:**
- Modify: `packages/core/src/module-graph.ts`
- Modify: `packages/core/src/application.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/module-graph-gateways.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { Injectable, Module, WebSocketGateway } from '@banhmi/common'
import { ModuleGraph } from '../src/module-graph'

@WebSocketGateway({ path: '/ws' })
@Injectable()
class TestGateway {}

@Module({ gateways: [TestGateway], providers: [TestGateway] })
class AppModule {}

describe('ModuleGraph gateways', () => {
  test('includes gateways in ModuleNode', () => {
    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)
    expect(tree.gateways).toEqual([TestGateway])
  })

  test('flattenModuleProviders includes gateway classes', () => {
    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)
    const providers = graph.flattenProviders(tree)
    expect(providers).toContain(TestGateway)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && bun test test/module-graph-gateways.test.ts
```

Expected: FAIL — `tree.gateways` is undefined

- [ ] **Step 3: Update `packages/core/src/module-graph.ts`**

```ts
import type { AbstractConstructor, ModuleMetadata } from '@banhmi/common'
import { MODULE_METADATA } from '@banhmi/common'

export interface ModuleNode {
  module: AbstractConstructor
  providers: ModuleMetadata['providers']
  controllers: ModuleMetadata['controllers']
  gateways: ModuleMetadata['gateways']
  exports: ModuleMetadata['exports']
  imports: ModuleNode[]
}

function getModuleMetadata(target: AbstractConstructor): ModuleMetadata {
  const meta = (target[Symbol.metadata] as Record<symbol, unknown> | null)?.[
    MODULE_METADATA
  ]
  if (!meta) throw new Error(`${target.name} is not a @Module`)
  return meta as ModuleMetadata
}

export function flattenModuleProviders(
  node: ModuleNode,
): NonNullable<ModuleMetadata['providers']> {
  const providers: NonNullable<ModuleMetadata['providers']> = []
  const seen = new Set<AbstractConstructor>()

  function walk(n: ModuleNode): void {
    if (seen.has(n.module)) return
    seen.add(n.module)
    for (const imp of n.imports) walk(imp)
    providers.push(...(n.providers ?? []))
    providers.push(...(n.controllers ?? []))
    providers.push(...(n.gateways ?? []))
  }

  walk(node)
  return providers
}

export class ModuleGraph {
  private visited = new Map<AbstractConstructor, ModuleNode>()
  private visiting = new Set<AbstractConstructor>()

  buildTree(rootModule: AbstractConstructor): ModuleNode {
    if (this.visiting.has(rootModule)) {
      throw new Error(
        `Circular module dependency detected involving ${rootModule.name}`,
      )
    }

    const cached = this.visited.get(rootModule)
    if (cached) return cached

    this.visiting.add(rootModule)

    const meta = getModuleMetadata(rootModule)
    const node: ModuleNode = {
      module: rootModule,
      providers: meta.providers ?? [],
      controllers: meta.controllers ?? [],
      gateways: meta.gateways ?? [],
      exports: meta.exports ?? [],
      imports: (meta.imports ?? []).map((m) => this.buildTree(m)),
    }

    this.visiting.delete(rootModule)
    this.visited.set(rootModule, node)

    return node
  }

  flattenProviders(node: ModuleNode): NonNullable<ModuleMetadata['providers']> {
    return flattenModuleProviders(node)
  }
}
```

- [ ] **Step 4: Run the new test to verify it passes**

```bash
cd packages/core && bun test test/module-graph-gateways.test.ts
```

Expected: PASS — 2 tests pass

- [ ] **Step 5: Update `packages/core/src/application.ts`**

Add `registerGateway?` to `HttpAdapter` and `flattenGateways` + call in `listen`:

```ts
import type {
  AbstractConstructor,
  ClassConstructor,
  ProviderDef,
} from '@banhmi/common'
import type { Container } from './container'
import { LifecycleRunner } from './lifecycle-runner'
import { type ModuleNode, flattenModuleProviders } from './module-graph'

export interface HttpAdapter {
  registerController(instance: object, controllerClass: ClassConstructor): void
  registerGateway?(instance: object, gatewayClass: ClassConstructor): void
  listen(port: number): Promise<void>
  close(): Promise<void>
  use(middleware: unknown): void
}

export class BanhmiApplication {
  private lifecycleRunner: LifecycleRunner
  private allProviders: ProviderDef[]
  private shutdownHooksEnabled = false

  constructor(
    readonly container: Container,
    readonly moduleTree: ModuleNode,
    readonly adapter: HttpAdapter,
  ) {
    this.lifecycleRunner = new LifecycleRunner(container)
    this.allProviders = flattenModuleProviders(moduleTree)
  }

  use(middleware: unknown): this {
    this.adapter.use(middleware)
    return this
  }

  enableShutdownHooks(): this {
    this.shutdownHooksEnabled = true
    return this
  }

  async listen(port: number): Promise<void> {
    await this.lifecycleRunner.runModuleInit(this.allProviders)

    for (const ctrl of this.flattenControllers(this.moduleTree)) {
      const instance = this.container.resolve(ctrl)
      this.adapter.registerController(instance as object, ctrl)
    }

    for (const gw of this.flattenGateways(this.moduleTree)) {
      const instance = this.container.resolve(gw)
      this.adapter.registerGateway?.(instance as object, gw)
    }

    await this.adapter.listen(port)
    await this.lifecycleRunner.runApplicationBootstrap(this.allProviders)

    if (this.shutdownHooksEnabled) {
      for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        process.once(signal, async () => {
          await this.close(signal)
          process.exit(0)
        })
      }
    }
  }

  async close(signal?: string): Promise<void> {
    await this.lifecycleRunner.runModuleDestroy(this.allProviders)
    await this.adapter.close()
    await this.lifecycleRunner.runApplicationShutdown(this.allProviders, signal)
  }

  private flattenControllers(node: ModuleNode): ClassConstructor[] {
    const seen = new Set<AbstractConstructor>()
    const result: ClassConstructor[] = []

    function walk(n: ModuleNode) {
      if (seen.has(n.module)) return
      seen.add(n.module)
      for (const imp of n.imports) walk(imp)
      result.push(...((n.controllers ?? []) as ClassConstructor[]))
    }

    walk(node)
    return result
  }

  private flattenGateways(node: ModuleNode): ClassConstructor[] {
    const seen = new Set<AbstractConstructor>()
    const result: ClassConstructor[] = []

    function walk(n: ModuleNode) {
      if (seen.has(n.module)) return
      seen.add(n.module)
      for (const imp of n.imports) walk(imp)
      result.push(...((n.gateways ?? []) as ClassConstructor[]))
    }

    walk(node)
    return result
  }
}
```

- [ ] **Step 6: Run full core test suite**

```bash
cd packages/core && bun test
```

Expected: all tests pass (including new module-graph-gateways tests)

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/module-graph.ts \
        packages/core/src/application.ts \
        packages/core/test/module-graph-gateways.test.ts
git commit -m "feat(core): add gateway support to ModuleNode and BanhmiApplication"
```

---

## Task 5: WebSocket integration test

**Files:**
- Create: `packages/platform-bun/test/websocket.test.ts`

- [ ] **Step 1: Write the integration test**

Create `packages/platform-bun/test/websocket.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  Injectable,
  Module,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@banhmi/common'
import type { WsContext } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import type { Server } from 'bun'
import { BanhmiFactory } from '../src/factory'

// ─── Gateway ─────────────────────────────────────────────────────────────────

@WebSocketGateway({ path: '/ws' })
@Injectable()
class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server

  readonly events: string[] = []

  afterInit(_server: unknown): void {
    this.events.push('init')
  }

  handleConnection(_ctx: WsContext): void {
    this.events.push('connected')
  }

  handleDisconnect(_ctx: WsContext): void {
    this.events.push('disconnected')
  }

  @SubscribeMessage('ping')
  handlePing(_ctx: WsContext): { pong: string } {
    return { pong: 'ok' }
  }

  @SubscribeMessage('echo')
  handleEcho(ctx: WsContext): unknown {
    return ctx.data
  }
}

// ─── Module ──────────────────────────────────────────────────────────────────

@Module({
  gateways: [ChatGateway],
  providers: [ChatGateway],
})
class WsAppModule {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wsConnect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.onopen = () => resolve(ws)
    ws.onerror = (e) => reject(e)
  })
}

function wsSend(
  ws: WebSocket,
  event: string,
  data: unknown,
): Promise<{ event: string; data: unknown }> {
  return new Promise((resolve) => {
    ws.onmessage = (e) => resolve(JSON.parse(e.data as string) as { event: string; data: unknown })
    ws.send(JSON.stringify({ event, data }))
  })
}

function wsClose(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    ws.onclose = () => resolve()
    ws.close()
  })
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const PORT = 54323
const WS_URL = `ws://localhost:${PORT}/ws`

let app: BanhmiApplication
let gateway: ChatGateway

beforeAll(async () => {
  app = await BanhmiFactory.create(WsAppModule)
  await app.listen(PORT)
  gateway = app.container.resolve(ChatGateway) as ChatGateway
})

afterAll(async () => {
  await app.close()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WebSocket gateway lifecycle', () => {
  test('afterInit is called with server after listen', () => {
    expect(gateway.events).toContain('init')
    expect(gateway.server).toBeDefined()
  })
})

describe('WebSocket connection', () => {
  test('ping returns pong', async () => {
    const ws = await wsConnect(WS_URL)
    const response = await wsSend(ws, 'ping', null)
    expect(response).toEqual({ event: 'ping', data: { pong: 'ok' } })
    await wsClose(ws)
  })

  test('echo returns the sent data', async () => {
    const ws = await wsConnect(WS_URL)
    const response = await wsSend(ws, 'echo', { hello: 'world' })
    expect(response).toEqual({ event: 'echo', data: { hello: 'world' } })
    await wsClose(ws)
  })

  test('unknown event gets no response (handler missing)', async () => {
    const ws = await wsConnect(WS_URL)
    let received = false
    ws.onmessage = () => { received = true }
    ws.send(JSON.stringify({ event: 'unknown', data: null }))
    // Wait briefly — no message should arrive
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(received).toBe(false)
    await wsClose(ws)
  })

  test('invalid JSON sends error response', async () => {
    const ws = await wsConnect(WS_URL)
    const response = await new Promise<{ error: string }>((resolve) => {
      ws.onmessage = (e) => resolve(JSON.parse(e.data as string) as { error: string })
      ws.send('not json')
    })
    expect(response.error).toBe('Invalid JSON')
    await wsClose(ws)
  })

  test('handleConnection and handleDisconnect are called', async () => {
    const before = gateway.events.length
    const ws = await wsConnect(WS_URL)
    await wsClose(ws)
    // Wait for close to propagate
    await new Promise((resolve) => setTimeout(resolve, 50))
    const newEvents = gateway.events.slice(before)
    expect(newEvents).toContain('connected')
    expect(newEvents).toContain('disconnected')
  })
})

describe('HTTP still works alongside WebSockets', () => {
  test('HTTP 404 for unknown route', async () => {
    const res = await fetch(`http://localhost:${PORT}/unknown`)
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/platform-bun && bun test test/websocket.test.ts
```

Expected: FAIL — WebSocket connection refused or module errors (implementation not yet in place from Tasks 1–4). If Tasks 1–4 are done, most tests should pass at this point.

- [ ] **Step 3: Run test to verify all tests pass**

```bash
cd packages/platform-bun && bun test test/websocket.test.ts
```

Expected: PASS — all 8 tests pass

- [ ] **Step 4: Run the entire test suite to check for regressions**

```bash
bun test --recursive
```

Expected: all tests pass (90+ including new WebSocket tests)

- [ ] **Step 5: Run lint**

```bash
bun run lint
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/platform-bun/test/websocket.test.ts
git commit -m "test(platform-bun): add WebSocket gateway integration tests"
```

---

## Task 6: Demo gateway in `cats-api` example

**Files:**
- Create: `examples/cats-api/src/events/events.gateway.ts`
- Modify: `examples/cats-api/src/app.module.ts`

- [ ] **Step 1: Create `examples/cats-api/src/events/events.gateway.ts`**

```ts
import {
  Injectable,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from 'banhmi'
import type { WsContext } from 'banhmi'
import type { Server } from 'bun'

@WebSocketGateway({ path: '/events' })
@Injectable()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server

  afterInit(_server: unknown): void {
    console.log('EventsGateway initialized')
  }

  handleConnection(ctx: WsContext): void {
    console.log(`Client connected from ${ctx.remoteAddress}`)
  }

  handleDisconnect(_ctx: WsContext): void {
    console.log('Client disconnected')
  }

  @SubscribeMessage('ping')
  handlePing(_ctx: WsContext): { message: string; timestamp: number } {
    return { message: 'pong', timestamp: Date.now() }
  }

  @SubscribeMessage('broadcast')
  handleBroadcast(ctx: WsContext): void {
    const msg = ctx.data as { text: string }
    // Subscribe sender to 'room' and broadcast to all subscribers
    ctx.subscribe('room')
    ctx.publish('room', JSON.stringify({ event: 'message', data: { text: msg.text } }))
  }
}
```

- [ ] **Step 2: Read the existing `examples/cats-api/src/app.module.ts`**

Check the current contents:

```bash
cat examples/cats-api/src/app.module.ts
```

- [ ] **Step 3: Add `EventsGateway` to `AppModule`**

The updated `app.module.ts` should look like:

```ts
import { Module } from 'banhmi'
import { CatsModule } from './cats/cats.module'
import { EventsGateway } from './events/events.gateway'

@Module({
  imports: [CatsModule],
  gateways: [EventsGateway],
  providers: [EventsGateway],
})
export class AppModule {}
```

- [ ] **Step 4: Run the cats-api dev server to verify no startup errors**

```bash
cd examples/cats-api && bun run dev
```

Expected: server starts, console logs `EventsGateway initialized`, no errors. Connect with a WebSocket client at `ws://localhost:3000/events` to verify.

Press `Ctrl+C` to stop.

- [ ] **Step 5: Commit**

```bash
git add examples/cats-api/src/events/events.gateway.ts \
        examples/cats-api/src/app.module.ts
git commit -m "feat(cats-api): add EventsGateway WebSocket demo"
```

---

## Self-Review

**Spec coverage:**
- ✅ `@WebSocketGateway(options?)` — Task 1
- ✅ `@SubscribeMessage('event')` — Task 1
- ✅ `@WebSocketServer()` — Task 1
- ✅ `WsContext` interface — Task 1
- ✅ `OnGatewayInit/Connection/Disconnect` lifecycle — Tasks 1 + 5
- ✅ `BunWsContext` wrapping `ServerWebSocket` — Task 2
- ✅ `WsGatewayExplorer` — Task 2
- ✅ `BunAdapter.registerGateway` — Task 3
- ✅ WS upgrade handling in `handleFetch` — Task 3
- ✅ `ModuleNode.gateways` — Task 4
- ✅ `flattenModuleProviders` includes gateways — Task 4
- ✅ `BanhmiApplication.flattenGateways` + calling `registerGateway` — Task 4
- ✅ Integration test — Task 5
- ✅ Example gateway — Task 6

**Type consistency:** `WsGatewayMetadata.path` defined in Task 1 and consumed in Tasks 2–3. `BunWsData.gatewayPath` defined in Task 2 and used in Task 3. `ExploredGateway` defined in Task 2 and used in Task 3.

**No placeholders:** All steps contain complete code.
