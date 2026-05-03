import type { ClassConstructor } from '@bunnest/common'
import type { HttpAdapter } from '@bunnest/core'
import type { Server } from 'bun'
import { type RegisteredFilter, runEnhancerPipeline } from './enhancer-pipeline'
import { BunExecutionContext } from './execution-context'
import { BunRouteCtx } from './route-ctx'
import { RouteExplorer } from './route-explorer'
import { RadixRouter } from './router'

type MiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

export class BunAdapter implements HttpAdapter {
  private router = new RadixRouter()
  private explorer = new RouteExplorer()
  private middleware: MiddlewareFn[] = []
  private server: Server | null = null

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

  async listen(port: number): Promise<void> {
    this.server = Bun.serve({
      port,
      fetch: (req) => this.handleRequest(req),
    })
  }

  async close(): Promise<void> {
    await this.server?.stop(true)
    this.server = null
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
