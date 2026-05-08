import type { ClassConstructor } from '@banhmi/common'
import type { Container, ModuleNode } from '@banhmi/core'
import type { DiEdge, DiGraph, DiNode } from '../types'

/**
 * Serialise the DI container and module tree into a {@link DiGraph}.
 *
 * Walk all modules in the tree. For each module emit a `kind: 'module'` node.
 * For each provider/controller in a module emit a `kind: 'provider'` or
 * `kind: 'controller'` node plus the following edges:
 * - `imports`: module → imported module.
 * - `provides`: module → its providers/controllers.
 * - `depends-on`: provider/controller → each of its `static inject` deps.
 *
 * The `container` parameter is accepted for API symmetry and future use
 * (e.g. inspecting resolved singletons) but the graph is currently derived
 * entirely from the module tree, which carries all structural information.
 *
 * @param _container - The active DI {@link Container}.
 * @param moduleTree - Root {@link ModuleNode} returned by `ModuleGraph.buildTree`.
 * @returns A {@link DiGraph} with deduplicated nodes and edges.
 */
export function dumpGraph(
  _container: Container,
  moduleTree: ModuleNode,
): DiGraph {
  const nodes = new Map<string, DiNode>()
  const edges: DiEdge[] = []
  const visitedModules = new Set<string>()

  function moduleId(
    mod: ClassConstructor | (abstract new (...args: never[]) => unknown),
  ): string {
    return `module:${mod.name}`
  }

  function providerId(
    cls: ClassConstructor,
    kind: 'provider' | 'controller',
  ): string {
    return `${kind}:${cls.name}`
  }

  function addNode(node: DiNode): void {
    if (!nodes.has(node.id)) nodes.set(node.id, node)
  }

  function addEdge(edge: DiEdge): void {
    // Avoid duplicate edges
    const key = `${edge.from}|${edge.kind}|${edge.to}`
    if (!edges.some((e) => `${e.from}|${e.kind}|${e.to}` === key)) {
      edges.push(edge)
    }
  }

  function walkModule(node: ModuleNode): void {
    const modId = moduleId(node.module as ClassConstructor)
    if (visitedModules.has(modId)) return
    visitedModules.add(modId)

    addNode({ id: modId, kind: 'module', name: node.module.name })

    // imports edges: this module → imported modules
    for (const imp of node.imports) {
      const impId = moduleId(imp.module as ClassConstructor)
      addEdge({ from: modId, to: impId, kind: 'imports' })
      walkModule(imp)
    }

    // providers
    for (const provDef of node.providers ?? []) {
      if (typeof provDef !== 'function') continue
      const cls = provDef as ClassConstructor
      const pId = providerId(cls, 'provider')
      addNode({ id: pId, kind: 'provider', name: cls.name })
      addEdge({ from: modId, to: pId, kind: 'provides' })
      emitDepsEdges(cls, pId)
    }

    // controllers
    for (const ctrl of node.controllers ?? []) {
      const cls = ctrl as ClassConstructor
      const cId = providerId(cls, 'controller')
      addNode({ id: cId, kind: 'controller', name: cls.name })
      addEdge({ from: modId, to: cId, kind: 'provides' })
      emitDepsEdges(cls, cId)
    }
  }

  function emitDepsEdges(cls: ClassConstructor, fromId: string): void {
    const inject = (cls as { inject?: unknown[] }).inject
    if (!Array.isArray(inject)) return
    for (const dep of inject) {
      if (dep === null || dep === undefined) continue
      let depId: string
      if (typeof dep === 'function') {
        // Class dep — could be provider or controller; use generic "provider" as we
        // don't know which kind at this point (not critical for graph correctness)
        depId = `provider:${(dep as ClassConstructor).name}`
        // Ensure a node exists for it (might be a cross-module dep)
        if (!nodes.has(depId)) {
          addNode({
            id: depId,
            kind: 'provider',
            name: (dep as ClassConstructor).name,
          })
        }
      } else if (typeof dep === 'symbol') {
        depId = `provider:${String(dep)}`
        if (!nodes.has(depId)) {
          addNode({ id: depId, kind: 'provider', name: String(dep) })
        }
      } else {
        continue
      }
      addEdge({ from: fromId, to: depId, kind: 'depends-on' })
    }
  }

  walkModule(moduleTree)

  return { nodes: [...nodes.values()], edges }
}
