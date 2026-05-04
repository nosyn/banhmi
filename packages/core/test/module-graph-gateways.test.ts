import { describe, expect, test } from 'bun:test'
import { Injectable, Module, WebSocketGateway } from '@banhmi/common'
import { ModuleGraph } from '../src/module-graph'

@WebSocketGateway({ path: '/ws' })
@Injectable()
class TestGateway {}

@Module({ gateways: [TestGateway], providers: [TestGateway] })
class AppModule {}

describe('ModuleGraph gateways', () => {
  test('includes gateways in ModuleNode', () => {
    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)
    expect(tree.gateways).toEqual([TestGateway])
  })

  test('flattenModuleProviders includes gateway classes', () => {
    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)
    const providers = graph.flattenProviders(tree)
    expect(providers).toContain(TestGateway)
  })
})
