import type { AbstractConstructor } from '@banhmi/common'
import { BunnestApplication, Container, ModuleGraph } from '@banhmi/core'
import { BunAdapter } from './bun-adapter'

// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style factory
export class BunnestFactory {
  static async create(
    rootModule: AbstractConstructor,
  ): Promise<BunnestApplication> {
    const graph = new ModuleGraph()
    const moduleTree = graph.buildTree(rootModule)

    const container = new Container()
    const allProviders = graph.flattenProviders(moduleTree)
    for (const provider of allProviders) {
      container.register(provider)
    }

    const adapter = new BunAdapter()
    return new BunnestApplication(container, moduleTree, adapter)
  }
}
