import type { AbstractConstructor } from '@banhmi/common'
import { Token } from '@banhmi/common'
import { BanhmiApplication, Container, ModuleGraph } from '@banhmi/core'
import type { HttpAdapter } from '@banhmi/core'
import { BunAdapter } from './bun-adapter'

/**
 * DI token for the active {@link HttpAdapter} instance.
 *
 * Inject this in any provider that needs to register middleware or
 * otherwise interact with the underlying HTTP adapter at bootstrap time.
 *
 * @example
 * class MyProvider implements OnApplicationBootstrap {
 *   static inject = [HTTP_ADAPTER_TOKEN] as const
 *   constructor(private adapter: HttpAdapter) {}
 *   onApplicationBootstrap() {
 *     this.adapter.use(myMiddlewareFn)
 *   }
 * }
 */
export const HTTP_ADAPTER_TOKEN = Token<HttpAdapter>('HTTP_ADAPTER')

// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style factory
export class BanhmiFactory {
  static async create(
    rootModule: AbstractConstructor,
  ): Promise<BanhmiApplication> {
    const graph = new ModuleGraph()
    const moduleTree = graph.buildTree(rootModule)

    const container = new Container()
    const allProviders = graph.flattenProviders(moduleTree)
    for (const provider of allProviders) {
      container.register(provider)
    }

    const adapter = new BunAdapter()
    // Register the adapter so modules can inject it via HTTP_ADAPTER_TOKEN
    container.register({ provide: HTTP_ADAPTER_TOKEN, useValue: adapter })
    return new BanhmiApplication(container, moduleTree, adapter)
  }
}
