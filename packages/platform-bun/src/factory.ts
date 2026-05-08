import type { AbstractConstructor } from '@banhmi/common'
import { Token } from '@banhmi/common'
import type { HttpAdapter, ModuleNode } from '@banhmi/core'
import { BanhmiApplication, Container, ModuleGraph } from '@banhmi/core'
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

/**
 * DI token for the {@link Container} instance used by the current application.
 *
 * Inject this when a bootstrap service needs to resolve providers dynamically
 * (e.g. to walk all registered class providers for metadata discovery).
 *
 * @example
 * class MyExplorer implements OnApplicationBootstrap {
 *   static inject = [CONTAINER_TOKEN] as const
 *   constructor(private container: Container) {}
 *   onApplicationBootstrap() {
 *     // resolve providers dynamically
 *   }
 * }
 */
export const CONTAINER_TOKEN = Token<Container>('CONTAINER')

/**
 * DI token for the root {@link ModuleNode} of the module tree.
 *
 * Inject this when a bootstrap service needs to traverse the full module
 * graph to discover decorated providers.
 *
 * @example
 * class MyExplorer implements OnApplicationBootstrap {
 *   static inject = [MODULE_TREE_TOKEN] as const
 *   constructor(private tree: ModuleNode) {}
 * }
 */
export const MODULE_TREE_TOKEN = Token<ModuleNode>('MODULE_TREE')

// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style factory
export class BanhmiFactory {
  /**
   * Create a {@link BanhmiApplication} from the given root module.
   *
   * Registers the {@link HTTP_ADAPTER_TOKEN}, {@link CONTAINER_TOKEN}, and
   * {@link MODULE_TREE_TOKEN} DI tokens so that bootstrap services can
   * interact with the adapter and walk the module graph.
   *
   * @param rootModule - The root `@Module`-decorated class.
   * @returns A configured application ready to call `.listen()` on.
   *
   * @example
   * const app = await BanhmiFactory.create(AppModule)
   * await app.listen(3000)
   */
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
    // Register infrastructure tokens so bootstrap services can inject them
    container.register({ provide: HTTP_ADAPTER_TOKEN, useValue: adapter })
    container.register({ provide: CONTAINER_TOKEN, useValue: container })
    container.register({ provide: MODULE_TREE_TOKEN, useValue: moduleTree })
    return new BanhmiApplication(container, moduleTree, adapter)
  }
}
