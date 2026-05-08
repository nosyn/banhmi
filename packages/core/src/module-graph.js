import { MODULE_METADATA } from '@banhmi/common'

function getModuleMetadata(target) {
  const meta = target[Symbol.metadata]?.[MODULE_METADATA]
  if (!meta) throw new Error(`${target.name} is not a @Module`)
  return meta
}
export function flattenModuleProviders(node) {
  const providers = []
  const seen = new Set()
  function walk(n) {
    if (seen.has(n.module)) return
    seen.add(n.module)
    for (const imp of n.imports) walk(imp)
    providers.push(...(n.providers ?? []))
    providers.push(...(n.controllers ?? []))
    providers.push(...(n.gateways ?? []))
  }
  walk(node)
  return providers
}
export class ModuleGraph {
  visited = new Map()
  visiting = new Set()
  buildTree(rootModule) {
    if (this.visiting.has(rootModule)) {
      throw new Error(
        `Circular module dependency detected involving ${rootModule.name}`,
      )
    }
    const cached = this.visited.get(rootModule)
    if (cached) return cached
    this.visiting.add(rootModule)
    const meta = getModuleMetadata(rootModule)
    const node = {
      module: rootModule,
      providers: meta.providers ?? [],
      controllers: meta.controllers ?? [],
      gateways: meta.gateways ?? [],
      exports: meta.exports ?? [],
      imports: (meta.imports ?? []).map((m) => this.buildTree(m)),
    }
    this.visiting.delete(rootModule)
    this.visited.set(rootModule, node)
    return node
  }
  flattenProviders(node) {
    return flattenModuleProviders(node)
  }
}
