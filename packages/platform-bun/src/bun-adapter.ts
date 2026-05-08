import type { ClassConstructor, Interceptor } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import type { Server, ServerWebSocket } from 'bun'
import {
  type PipelineMiddlewareFn,
  type RegisteredFilter,
  runEnhancerPipeline,
} from './enhancer-pipeline'
import { BunExecutionContext } from './execution-context'
import { BunRouteCtx } from './route-ctx'
import { RouteExplorer } from './route-explorer'
import { RadixRouter } from './router'
import { BunWsContext, type BunWsData } from './ws-context'
import { type ExploredGateway, WsGatewayExplorer } from './ws-gateway-explorer'

/** Pre-request middleware function type used by `use()`. */
type PreRequestMiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

/**
 * Minimal versioning-options shape. Kept as a local structural type so
 * `@banhmi/platform-bun` does not take a hard dependency on
 * `@banhmi/versioning`.
 */
type VersioningOpts =
  | { type: 'uri'; prefix?: string; defaultVersion?: string }
  | { type: 'header'; header: string; defaultVersion?: string }
  | { type: 'media-type'; key: string; defaultVersion?: string }

/**
 * A module-level middleware binding: a resolved function + route pattern.
 * Kept as a structural type so `@banhmi/platform-bun` does not hard-depend
 * on `@banhmi/middleware`.
 */
interface ModuleMiddlewareBinding {
  fn: PipelineMiddlewareFn
  /** Normalised path (no leading/trailing slashes, e.g. `'cats'`). */
  path: string
  /** HTTP method filter, `'ALL'` means any method. */
  method: string
}

/** Resolves a version string from a request given the active strategy. */
function resolveVersionFromRequest(
  req: Request,
  opts: VersioningOpts,
): string | null {
  switch (opts.type) {
    case 'uri': {
      const prefix = opts.prefix ?? 'v'
      const pathname = new URL(req.url).pathname
      const pattern = new RegExp(`^/${escapeRe(prefix)}(\\d+)(?:/|$)`)
      const m = pathname.match(pattern)
      if (m?.[1]) return m[1]
      return opts.defaultVersion ?? null
    }
    case 'header': {
      const val = req.headers.get(opts.header)
      if (val) return val.trim()
      return opts.defaultVersion ?? null
    }
    case 'media-type': {
      const accept = req.headers.get('accept') ?? ''
      const pattern = new RegExp(
        `application/vnd\\.${escapeRe(opts.key)}\\.v(\\d+)\\+json`,
        'i',
      )
      const m = accept.match(pattern)
      if (m?.[1]) return m[1]
      return opts.defaultVersion ?? null
    }
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Resolves an `unknown` middleware (fn or class) to a `PipelineMiddlewareFn`
 * or `null` if it cannot be resolved.
 *
 * Class constructors are detected by having a `.prototype` object AND by
 * being constructable (i.e. not an arrow function). Arrow functions have no
 * `.prototype` at all; regular functions and class constructors do. We
 * distinguish a class from a regular function by trying `new` — but since we
 * can't know ahead of time, we check for `prototype` existing (arrow fns don't
 * have it) AND the function having an uppercase first letter as a heuristic,
 * OR just always try to instantiate if prototype.use exists on the instance.
 */
function resolveMiddlewareFnFromUnknown(
  mw: unknown,
): PipelineMiddlewareFn | null {
  if (typeof mw !== 'function') return null

  const fn = mw as { prototype?: Record<string, unknown>; name?: string }

  // Check if it looks like a class constructor (has prototype, and prototype
  // has a 'use' function — either as method or will be set in constructor).
  if (fn.prototype) {
    // Try to detect class-like: prototype.use is a function (method on proto)
    if (typeof fn.prototype.use === 'function') {
      const inst = new (mw as new () => { use: PipelineMiddlewareFn })()
      return inst.use.bind(inst)
    }

    // Class with 'use' as an instance field (not on prototype) — instantiate
    // and check the instance.
    // We detect a class constructor by checking if the function body contains
    // `class` in its source, OR by convention: named functions starting with
    // uppercase are classes. Use a try/catch to handle both.
    const name = fn.name ?? ''
    const isUppercase =
      name.length > 0 &&
      name[0] === name[0]?.toUpperCase() &&
      name[0] !== name[0]?.toLowerCase()
    if (isUppercase || Object.hasOwn(fn, 'prototype')) {
      try {
        const inst = new (mw as new () => { use?: PipelineMiddlewareFn })()
        if (typeof inst.use === 'function') {
          return inst.use.bind(inst)
        }
      } catch {
        // Not a constructor — fall through to plain function
      }
    }
  }

  return mw as PipelineMiddlewareFn
}

/**
 * Normalises a raw route value from a `forRoutes(...)` call into a
 * `{ path, method }` pair.
 */
function normalizeModuleRoute(route: unknown): {
  path: string
  method: string
} {
  if (typeof route === 'string') {
    return { path: route.replace(/^\/|\/$/g, ''), method: 'ALL' }
  }

  if (route !== null && typeof route === 'object') {
    const r = route as { path?: string; method?: string }
    return {
      path: (r.path ?? '').replace(/^\/|\/$/g, ''),
      method: r.method ?? 'ALL',
    }
  }

  return { path: '', method: 'ALL' }
}

/**
 * Returns `true` when the given request matches a module middleware binding.
 * Path match: the request pathname (stripped of version prefix if applicable)
 * must equal or start with `/<binding.path>/`.
 */
function moduleMiddlewareMatches(
  binding: ModuleMiddlewareBinding,
  method: string,
  pathname: string,
): boolean {
  if (binding.method !== 'ALL' && binding.method !== method) return false
  const prefix = `/${binding.path}`
  return (
    pathname === prefix ||
    pathname.startsWith(`${prefix}/`) ||
    // Handle empty path as match-all
    binding.path === ''
  )
}

export class BunAdapter implements HttpAdapter {
  private router = new RadixRouter()
  private explorer = new RouteExplorer()
  private wsExplorer = new WsGatewayExplorer()
  private preRequestMiddleware: PreRequestMiddlewareFn[] = []
  private moduleMiddlewareBindings: ModuleMiddlewareBinding[] = []
  private server: Server | null = null
  private gateways: Array<ExploredGateway & { instance: object }> = []
  private versioningOpts: VersioningOpts | null = null

  /**
   * Install versioning options. Called by `VersioningBootstrapper` on
   * application bootstrap when `VersioningModule.forRoot` is used.
   *
   * @param opts - Active versioning strategy configuration.
   */
  setVersioningOptions(opts: VersioningOpts): void {
    this.versioningOpts = opts
  }

  /**
   * Register a module-level middleware binding.
   *
   * Called by `MiddlewareBootstrapper` during application bootstrap after
   * processing all `configure(consumer)` calls. Bindings are matched against
   * requests at dispatch time.
   *
   * @param binding - The middleware function and its route pattern.
   */
  registerMiddlewareBinding(binding: ModuleMiddlewareBinding): void {
    this.moduleMiddlewareBindings.push(binding)
  }

  /**
   * Called by `BanhmiApplication` after walking all module `configure()`
   * hooks. Receives raw `{ mws, routes }` bindings, resolves middleware
   * functions, normalises route patterns, and stores them for dispatch-time
   * matching.
   *
   * @param rawBindings - Array of `{ mws: unknown[]; routes: unknown[] }` collected
   *   from each `configure()` call.
   */
  registerMiddlewareBindings(rawBindings: unknown[]): void {
    for (const raw of rawBindings) {
      const binding = raw as { mws: unknown[]; routes: unknown[] }
      const fns = binding.mws
        .map((mw) => resolveMiddlewareFnFromUnknown(mw))
        .filter((fn): fn is PipelineMiddlewareFn => fn !== null)

      for (const route of binding.routes) {
        const { path, method } = normalizeModuleRoute(route)
        for (const fn of fns) {
          this.moduleMiddlewareBindings.push({ fn, path, method })
        }
      }
    }
  }

  use(middleware: unknown): void {
    if (typeof middleware !== 'function') {
      throw new TypeError(
        `BunAdapter.use() expects a function, got ${typeof middleware}`,
      )
    }
    this.preRequestMiddleware.push(middleware as PreRequestMiddlewareFn)
  }

  registerController(
    instance: object,
    controllerClass: ClassConstructor,
  ): void {
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
        ;(gw.instance as Record<string, unknown>)[propName] = this.server
      }
      gw.lifecycle.onInit?.(this.server)
    }
  }

  async close(): Promise<void> {
    await this.server?.stop(true)
    this.server = null
  }

  getUrl(): string {
    if (!this.server) throw new Error('Server is not listening yet')
    return `http://localhost:${this.server.port}`
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
    return this.runPreRequestMiddleware(request, () =>
      this.dispatchRoute(request),
    )
  }

  private async dispatchRoute(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // When versioning is active, strip the version prefix from the pathname
    // before matching (URI strategy) so routes registered at `/cats` still
    // match requests coming in at `/v1/cats`.
    let matchPathname = url.pathname
    let strippedVersion: string | null = null

    if (this.versioningOpts?.type === 'uri') {
      const prefix = this.versioningOpts.prefix ?? 'v'
      const pattern = new RegExp(`^/${escapeRe(prefix)}(\\d+)(/.*)$`)
      const m = matchPathname.match(pattern)
      if (m) {
        strippedVersion = m[1] ?? null
        matchPathname = m[2] ?? '/'
      }
    }

    // Collect all path+method matches, then filter by version compatibility.
    const candidates = this.router.matchAll(request.method, matchPathname)

    let match = null

    if (this.versioningOpts) {
      // Resolve the requested version (from URI strip, header, or media-type)
      const requestedVersion =
        strippedVersion ??
        resolveVersionFromRequest(request, this.versioningOpts)

      // Prefer a versioned route that matches, fall back to unversioned
      for (const candidate of candidates) {
        if (candidate.version === undefined) {
          // Unversioned route — keep as a fallback but keep looking
          if (!match) match = candidate
        } else if (candidate.version === requestedVersion) {
          // Exact version match wins immediately
          match = candidate
          break
        }
      }
    } else {
      // No versioning configured — use the first match as before
      match = candidates[0] ?? null
    }

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
    const interceptorInstances = match.interceptors.map((I) =>
      typeof I === 'function'
        ? new (I as new () => Interceptor)()
        : (I as Interceptor),
    )
    const filterInstances: RegisteredFilter[] = match.filters.map((F) => ({
      filterInstance: new F() as RegisteredFilter['filterInstance'],
    }))

    // Collect middleware: module-level bindings that match this route, then
    // controller/handler-level middleware from the route descriptor.
    const matchingModuleMiddlewares = this.moduleMiddlewareBindings
      .filter((b) => moduleMiddlewareMatches(b, request.method, matchPathname))
      .map((b) => b.fn)

    const allMiddlewares: PipelineMiddlewareFn[] = [
      ...matchingModuleMiddlewares,
      ...match.middlewares,
    ]

    return runEnhancerPipeline(
      execCtx,
      () => match.handler(routeCtx),
      guardInstances,
      interceptorInstances,
      filterInstances,
      match.httpCode ?? 200,
      match.responseHeaders,
      allMiddlewares,
    )
  }

  private async runPreRequestMiddleware(
    request: Request,
    final: () => Promise<Response>,
  ): Promise<Response> {
    const chain = [...this.preRequestMiddleware]

    const execute = (index: number): Promise<Response> => {
      const mw = chain[index]
      if (!mw) return final()
      return mw(request, () => execute(index + 1))
    }

    return execute(0)
  }
}
