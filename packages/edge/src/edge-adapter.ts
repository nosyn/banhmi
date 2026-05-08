import type { AbstractConstructor } from '@banhmi/common'
import { BanhmiApplication, Container, ModuleGraph } from '@banhmi/core'
import { BunAdapter } from '@banhmi/platform-bun'
import type { EdgeHandlerOptions } from './types'

/**
 * Build a `(request: Request) => Promise<Response>` handler that runs a
 * Banhmi application inside Cloudflare Workers / Vercel Edge / Deno Deploy.
 *
 * The function bootstraps the full Banhmi lifecycle (module init, controller
 * registration, bootstrap hooks) but skips `Bun.serve` so the runtime can
 * supply its own request/response transport.
 *
 * @param AppModule - The root `@Module`-decorated class.
 * @param opts - Optional edge-specific configuration.
 * @returns A WinterCG-compatible `(req: Request) => Promise<Response>` fetch handler.
 *
 * @example
 * // Cloudflare Workers
 * import { createEdgeHandler } from '@banhmi/edge'
 * import { AppModule } from './app.module'
 * export default { fetch: await createEdgeHandler(AppModule) }
 *
 * @example
 * // Vercel Edge / Deno Deploy
 * import { createEdgeHandler } from '@banhmi/edge'
 * import { AppModule } from './app.module'
 * export const handler = await createEdgeHandler(AppModule)
 */
export async function createEdgeHandler(
  AppModule: AbstractConstructor,
  opts?: EdgeHandlerOptions,
): Promise<(req: Request) => Promise<Response>> {
  const graph = new ModuleGraph()
  const moduleTree = graph.buildTree(AppModule)

  const container = new Container()
  const allProviders = graph.flattenProviders(moduleTree)
  for (const provider of allProviders) {
    container.register(provider)
  }

  const adapter = new BunAdapter()
  const app = new BanhmiApplication(container, moduleTree, adapter)
  await app.init()

  return async (req: Request): Promise<Response> => {
    // If a global prefix is configured, rewrite the request URL to strip the
    // prefix before dispatching — routes are registered without the prefix.
    let dispatched = req
    if (opts?.globalPrefix) {
      const url = new URL(req.url)
      const prefix = `/${opts.globalPrefix.replace(/^\/|\/$/g, '')}`
      if (url.pathname.startsWith(prefix)) {
        const newPath = url.pathname.slice(prefix.length) || '/'
        url.pathname = newPath
        dispatched = new Request(url.toString(), {
          method: req.method,
          headers: req.headers,
          body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
        })
      }
    }

    return adapter.dispatchRequest(dispatched)
  }
}
