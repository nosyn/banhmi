import { runEnhancerPipeline } from './enhancer-pipeline'
import { BunExecutionContext } from './execution-context'
import { BunRouteCtx } from './route-ctx'
import { RouteExplorer } from './route-explorer'
import { RadixRouter } from './router'
import { BunWsContext } from './ws-context'
import { WsGatewayExplorer } from './ws-gateway-explorer'
export class BunAdapter {
  router = new RadixRouter()
  explorer = new RouteExplorer()
  wsExplorer = new WsGatewayExplorer()
  middleware = []
  server = null
  gateways = []
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new TypeError(
        `BunAdapter.use() expects a function, got ${typeof middleware}`,
      )
    }
    this.middleware.push(middleware)
  }
  registerController(instance, controllerClass) {
    const routes = this.explorer.explore(instance, controllerClass)
    for (const route of routes) {
      this.router.add(route)
    }
  }
  registerGateway(instance, gatewayClass) {
    const explored = this.wsExplorer.explore(instance, gatewayClass)
    if (explored) {
      this.gateways.push({ ...explored, instance })
    }
  }
  async listen(port) {
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
        gw.instance[propName] = this.server
      }
      gw.lifecycle.onInit?.(this.server)
    }
  }
  async close() {
    await this.server?.stop(true)
    this.server = null
  }
  handleFetch(request, server) {
    const url = new URL(request.url)
    if (request.headers.get('upgrade') === 'websocket') {
      const gateway = this.gateways.find((gw) => gw.path === url.pathname)
      if (gateway) {
        const upgraded = server.upgrade(request, {
          data: { sessionId: crypto.randomUUID(), gatewayPath: url.pathname },
        })
        if (upgraded) return undefined
      }
      return new Response('Not Found', { status: 404 })
    }
    return this.handleRequest(request)
  }
  handleWsOpen(ws) {
    const gateway = this.gateways.find((gw) => gw.path === ws.data.gatewayPath)
    if (!gateway) return
    const ctx = new BunWsContext(ws, 'connection', null)
    gateway.lifecycle.onConnection?.(ctx)
  }
  handleWsMessage(ws, msg) {
    const text = typeof msg === 'string' ? msg : msg.toString()
    let parsed
    try {
      parsed = JSON.parse(text)
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
      .catch((err) => {
        ws.send(JSON.stringify({ error: String(err) }))
      })
  }
  handleWsClose(ws, _code, _reason) {
    const gateway = this.gateways.find((gw) => gw.path === ws.data.gatewayPath)
    if (!gateway) return
    const ctx = new BunWsContext(ws, 'disconnect', null)
    gateway.lifecycle.onDisconnect?.(ctx)
  }
  handleRequest(request) {
    return this.runMiddleware(request, () => this.dispatchRoute(request))
  }
  async dispatchRoute(request) {
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
    const interceptorInstances = match.interceptors.map((I) =>
      typeof I === 'function' ? new I() : I,
    )
    const filterInstances = match.filters.map((F) => ({
      filterInstance: new F(),
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
  async runMiddleware(request, final) {
    const chain = [...this.middleware]
    const execute = (index) => {
      const mw = chain[index]
      if (!mw) return final()
      return mw(request, () => execute(index + 1))
    }
    return execute(0)
  }
}
