import type { ClassConstructor, Interceptor } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import type { Server, ServerWebSocket } from 'bun'
import { type RegisteredFilter, runEnhancerPipeline } from './enhancer-pipeline'
import { BunExecutionContext } from './execution-context'
import { BunRouteCtx } from './route-ctx'
import { RouteExplorer } from './route-explorer'
import { RadixRouter } from './router'
import { BunWsContext, type BunWsData } from './ws-context'
import { type ExploredGateway, WsGatewayExplorer } from './ws-gateway-explorer'

/** Middleware function type used by the adapter's `use()` mechanism. */
type MiddlewareFn = (
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

export class BunAdapter implements HttpAdapter {
  private router = new RadixRouter()
  private explorer = new RouteExplorer()
  private wsExplorer = new WsGatewayExplorer()
  private middleware: MiddlewareFn[] = []
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

  use(middleware: unknown): void {
    if (typeof middleware !== 'function') {
      throw new TypeError(
        `BunAdapter.use() expects a function, got ${typeof middleware}`,
      )
    }
    this.middleware.push(middleware as MiddlewareFn)
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
    return this.runMiddleware(request, () => this.dispatchRoute(request))
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
      const mw = chain[index]
      if (!mw) return final()
      return mw(request, () => execute(index + 1))
    }

    return execute(0)
  }
}
