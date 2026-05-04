import type { ClassConstructor } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import type { Server, ServerWebSocket } from 'bun'
import { type RegisteredFilter, runEnhancerPipeline } from './enhancer-pipeline'
import { BunExecutionContext } from './execution-context'
import { BunRouteCtx } from './route-ctx'
import { RouteExplorer } from './route-explorer'
import { RadixRouter } from './router'
import { BunWsContext, type BunWsData } from './ws-context'
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
