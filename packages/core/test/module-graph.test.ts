import { describe, expect, test } from 'bun:test'
import { Injectable, MODULE_METADATA, Module } from '@banhmi/common'
import { ModuleGraph } from '../src/module-graph'

describe('ModuleGraph', () => {
  test('builds a single-module tree', () => {
    @Injectable()
    class AppService {}

    @Module({ providers: [AppService] })
    class AppModule {}

    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)

    expect(tree.module).toBe(AppModule)
    expect(tree.providers).toContain(AppService)
    expect(tree.imports).toHaveLength(0)
  })

  test('traverses imports recursively', () => {
    @Injectable()
    class CatsService {}

    @Module({ providers: [CatsService], exports: [CatsService] })
    class CatsModule {}

    @Module({ imports: [CatsModule] })
    class AppModule {}

    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)

    expect(tree.imports).toHaveLength(1)
    expect(tree.imports[0]?.module).toBe(CatsModule)
  })

  test('throws on circular dependency', () => {
    // @Module can't express circular refs in TS source, so craft metadata manually.
    // We need two classes: A imports B, B imports A.
    class ModA {}
    class ModB {}

    Object.defineProperty(ModA, Symbol.metadata, {
      value: { [MODULE_METADATA]: { imports: [ModB] } },
      configurable: true,
    })
    Object.defineProperty(ModB, Symbol.metadata, {
      value: { [MODULE_METADATA]: { imports: [ModA] } },
      configurable: true,
    })

    const graph = new ModuleGraph()
    expect(() => graph.buildTree(ModA as never)).toThrow(/circular/i)
  })

  test('throws when module is not decorated', () => {
    const graph = new ModuleGraph()
    expect(() => {
      class NotAModule {}
      graph.buildTree(NotAModule as never)
    }).toThrow(/is not a @Module/)
  })

  test('flattenProviders collects from all modules', () => {
    @Injectable()
    class ServiceA {}

    @Injectable()
    class ServiceB {}

    @Module({ providers: [ServiceA], exports: [ServiceA] })
    class ModuleA {}

    @Module({ imports: [ModuleA], providers: [ServiceB] })
    class RootModule {}

    const graph = new ModuleGraph()
    const tree = graph.buildTree(RootModule)
    const providers = graph.flattenProviders(tree)

    expect(providers).toContain(ServiceA)
    expect(providers).toContain(ServiceB)
  })
})
