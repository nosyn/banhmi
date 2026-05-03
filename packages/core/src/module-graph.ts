import type { AbstractConstructor, ModuleMetadata } from '@bunnest/common'
import { MODULE_METADATA } from '@bunnest/common'

export interface ModuleNode {
  module: AbstractConstructor
  providers: ModuleMetadata['providers']
  controllers: ModuleMetadata['controllers']
  exports: ModuleMetadata['exports']
  imports: ModuleNode[]
}

function getModuleMetadata(target: AbstractConstructor): ModuleMetadata {
  const meta = (target[Symbol.metadata] as Record<symbol, unknown> | null)?.[
    MODULE_METADATA
  ]
  if (!meta) throw new Error(`${target.name} is not a @Module`)
  return meta as ModuleMetadata
}

export function flattenModuleProviders(
  node: ModuleNode,
): NonNullable<ModuleMetadata['providers']> {
  const providers: NonNullable<ModuleMetadata['providers']> = []
  const seen = new Set<AbstractConstructor>()

  function walk(n: ModuleNode): void {
    if (seen.has(n.module)) return
    seen.add(n.module)
    for (const imp of n.imports) walk(imp)
    providers.push(...(n.providers ?? []))
    providers.push(...(n.controllers ?? []))
  }

  walk(node)
  return providers
}

export class ModuleGraph {
  private visited = new Map<AbstractConstructor, ModuleNode>()
  private visiting = new Set<AbstractConstructor>()

  buildTree(rootModule: AbstractConstructor): ModuleNode {
    if (this.visiting.has(rootModule)) {
      throw new Error(
        `Circular module dependency detected involving ${rootModule.name}`,
      )
    }

    const cached = this.visited.get(rootModule)
    if (cached) return cached

    this.visiting.add(rootModule)

    const meta = getModuleMetadata(rootModule)
    const node: ModuleNode = {
      module: rootModule,
      providers: meta.providers ?? [],
      controllers: meta.controllers ?? [],
      exports: meta.exports ?? [],
      imports: (meta.imports ?? []).map((m) => this.buildTree(m)),
    }

    this.visiting.delete(rootModule)
    this.visited.set(rootModule, node)

    return node
  }

  flattenProviders(node: ModuleNode): NonNullable<ModuleMetadata['providers']> {
    return flattenModuleProviders(node)
  }
}
