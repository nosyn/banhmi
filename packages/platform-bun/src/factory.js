import { Token } from '@banhmi/common'
import { BanhmiApplication, Container, ModuleGraph } from '@banhmi/core'
import { BunAdapter } from './bun-adapter'
export const HTTP_ADAPTER_TOKEN = Token('HTTP_ADAPTER')
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style factory
export class BanhmiFactory {
  static async create(rootModule) {
    const graph = new ModuleGraph()
    const moduleTree = graph.buildTree(rootModule)
    const container = new Container()
    const allProviders = graph.flattenProviders(moduleTree)
    for (const provider of allProviders) {
      container.register(provider)
    }
    const adapter = new BunAdapter()
    container.register({ provide: HTTP_ADAPTER_TOKEN, useValue: adapter })
    return new BanhmiApplication(container, moduleTree, adapter)
  }
}
