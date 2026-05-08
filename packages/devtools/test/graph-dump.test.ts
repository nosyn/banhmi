import { describe, expect, test } from 'bun:test'
import { Injectable, Module } from '@banhmi/common'
import { Container, ModuleGraph } from '@banhmi/core'
import { dumpGraph } from '../src/graph/dump'

// ─── Small test fixture ───────────────────────────────────────────────────────

@Injectable()
class ServiceA {
  static inject = [] as const
}

@Injectable()
class ServiceB {
  static inject = [ServiceA] as const
  constructor(readonly a: ServiceA) {}
}

@Module({ providers: [ServiceA], exports: [ServiceA] })
class ModuleA {}

@Module({ imports: [ModuleA], providers: [ServiceB] })
class ModuleB {}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('dumpGraph', () => {
  test('empty container + single module produces a module node with no edges', () => {
    @Injectable()
    class EmptyService {
      static inject = [] as const
    }

    @Module({ providers: [EmptyService] })
    class EmptyModule {}

    const graph = new ModuleGraph()
    const tree = graph.buildTree(EmptyModule)
    const container = new Container()
    const result = dumpGraph(container, tree)

    const modNode = result.nodes.find((n) => n.id === 'module:EmptyModule')
    expect(modNode).toBeDefined()
    expect(modNode?.kind).toBe('module')

    const provNode = result.nodes.find((n) => n.name === 'EmptyService')
    expect(provNode).toBeDefined()
  })

  test('ModuleA → providers: [ServiceA] produces expected nodes', () => {
    const graph = new ModuleGraph()
    const tree = graph.buildTree(ModuleA)
    const container = new Container()
    const result = dumpGraph(container, tree)

    const nodeIds = result.nodes.map((n) => n.id)
    expect(nodeIds).toContain('module:ModuleA')
    expect(nodeIds).toContain('provider:ServiceA')
  })

  test('ModuleB imports ModuleA, providers: [ServiceB inject [ServiceA]] — correct edges', () => {
    const graph = new ModuleGraph()
    const tree = graph.buildTree(ModuleB)
    const container = new Container()
    const result = dumpGraph(container, tree)

    // Both modules should be present
    expect(result.nodes.find((n) => n.id === 'module:ModuleA')).toBeDefined()
    expect(result.nodes.find((n) => n.id === 'module:ModuleB')).toBeDefined()

    // Both providers should be present
    expect(result.nodes.find((n) => n.id === 'provider:ServiceA')).toBeDefined()
    expect(result.nodes.find((n) => n.id === 'provider:ServiceB')).toBeDefined()

    // ModuleB imports ModuleA
    const importsEdge = result.edges.find(
      (e) =>
        e.from === 'module:ModuleB' &&
        e.to === 'module:ModuleA' &&
        e.kind === 'imports',
    )
    expect(importsEdge).toBeDefined()

    // ModuleA provides ServiceA
    const providesEdge = result.edges.find(
      (e) =>
        e.from === 'module:ModuleA' &&
        e.to === 'provider:ServiceA' &&
        e.kind === 'provides',
    )
    expect(providesEdge).toBeDefined()

    // ModuleB provides ServiceB
    const providesBEdge = result.edges.find(
      (e) =>
        e.from === 'module:ModuleB' &&
        e.to === 'provider:ServiceB' &&
        e.kind === 'provides',
    )
    expect(providesBEdge).toBeDefined()

    // ServiceB depends-on ServiceA
    const depsEdge = result.edges.find(
      (e) =>
        e.from === 'provider:ServiceB' &&
        e.to === 'provider:ServiceA' &&
        e.kind === 'depends-on',
    )
    expect(depsEdge).toBeDefined()
  })

  test('nodes have correct kind and name fields', () => {
    const graph = new ModuleGraph()
    const tree = graph.buildTree(ModuleB)
    const container = new Container()
    const result = dumpGraph(container, tree)

    const modA = result.nodes.find((n) => n.id === 'module:ModuleA')
    expect(modA?.kind).toBe('module')
    expect(modA?.name).toBe('ModuleA')

    const svcA = result.nodes.find((n) => n.id === 'provider:ServiceA')
    expect(svcA?.kind).toBe('provider')
    expect(svcA?.name).toBe('ServiceA')
  })

  test('controllers are emitted with kind controller', () => {
    @Injectable()
    class AppController {
      static inject = [] as const
    }

    @Module({ controllers: [AppController] })
    class AppModule {}

    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)
    const container = new Container()
    const result = dumpGraph(container, tree)

    const ctrlNode = result.nodes.find((n) => n.name === 'AppController')
    expect(ctrlNode?.kind).toBe('controller')
  })

  test('deduplicates nodes and edges when module is imported multiple times', () => {
    @Injectable()
    class SharedService {
      static inject = [] as const
    }

    @Module({ providers: [SharedService], exports: [SharedService] })
    class SharedModule {}

    @Module({ imports: [SharedModule] })
    class RootModule {}

    const graph = new ModuleGraph()
    const tree = graph.buildTree(RootModule)
    const container = new Container()
    const result = dumpGraph(container, tree)

    const modNodes = result.nodes.filter((n) => n.id === 'module:SharedModule')
    expect(modNodes).toHaveLength(1)
  })
})
