import type { DiGraph, DiNode } from '../types'

/**
 * Render a {@link DiGraph} as a self-contained HTML page using a nested-list
 * layout — modules show their providers/controllers and dependency arrows are
 * annotated as text. No external libraries or client-side JavaScript required.
 *
 * @param graph - The {@link DiGraph} to render.
 * @returns A complete HTML document string.
 */
export function renderGraphHtml(graph: DiGraph): string {
  const modules = graph.nodes.filter((n) => n.kind === 'module')
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))

  // Build: module id → children (providers + controllers provided by it)
  const moduleChildren = new Map<string, DiNode[]>()
  for (const mod of modules) {
    const children: DiNode[] = []
    for (const edge of graph.edges) {
      if (edge.from === mod.id && edge.kind === 'provides') {
        const child = nodeById.get(edge.to)
        if (child) children.push(child)
      }
    }
    moduleChildren.set(mod.id, children)
  }

  // Build: module id → imported module ids
  const moduleImports = new Map<string, string[]>()
  for (const mod of modules) {
    const imps: string[] = []
    for (const edge of graph.edges) {
      if (edge.from === mod.id && edge.kind === 'imports') {
        imps.push(edge.to)
      }
    }
    moduleImports.set(mod.id, imps)
  }

  // Build: node id → deps (depends-on targets)
  const nodeDeps = new Map<string, string[]>()
  for (const edge of graph.edges) {
    if (edge.kind === 'depends-on') {
      const deps = nodeDeps.get(edge.from) ?? []
      deps.push(edge.to)
      nodeDeps.set(edge.from, deps)
    }
  }

  function renderNodeItem(node: DiNode): string {
    const kindBadge = `<span class="badge badge-${node.kind}">${node.kind}</span>`
    const deps = nodeDeps.get(node.id) ?? []
    const depStr =
      deps.length > 0
        ? `<span class="deps">→ depends on: ${deps.map((d) => escHtml(nodeById.get(d)?.name ?? d)).join(', ')}</span>`
        : ''
    return `<li class="item item-${node.kind}">${kindBadge} <span class="name">${escHtml(node.name)}</span>${depStr}</li>`
  }

  function renderModule(mod: DiNode): string {
    const children = moduleChildren.get(mod.id) ?? []
    const imps = moduleImports.get(mod.id) ?? []
    const impStr =
      imps.length > 0
        ? `<div class="imports">imports: ${imps.map((i) => `<span class="import-ref">${escHtml(nodeById.get(i)?.name ?? i)}</span>`).join(', ')}</div>`
        : ''
    const childList =
      children.length > 0
        ? `<ul class="children">${children.map(renderNodeItem).join('')}</ul>`
        : '<p class="empty">no providers or controllers</p>'
    return `<div class="module">
  <div class="module-header">
    <span class="badge badge-module">module</span>
    <span class="module-name">${escHtml(mod.name)}</span>
  </div>
  ${impStr}
  ${childList}
</div>`
  }

  const moduleBlocks = modules.map(renderModule).join('\n')
  const isEmpty = modules.length === 0

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Banhmi Devtools — DI Graph</title>
  <style>
    body { font-family: monospace; margin: 2rem; background: #0f0f0f; color: #e2e2e2; }
    h1 { color: #a78bfa; margin-bottom: 1rem; }
    nav { margin-bottom: 1.5rem; }
    nav a { color: #60a5fa; margin-right: 1rem; text-decoration: none; }
    nav a:hover { text-decoration: underline; }
    .module { border: 1px solid #333; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; background: #141420; }
    .module-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .module-name { font-size: 1.1rem; font-weight: bold; color: #c4b5fd; }
    .badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 3px; font-weight: bold; text-transform: uppercase; }
    .badge-module { background: #4c1d95; color: #ddd6fe; }
    .badge-provider { background: #1e3a5f; color: #93c5fd; }
    .badge-controller { background: #14432a; color: #6ee7b7; }
    .imports { font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.5rem; }
    .import-ref { color: #c4b5fd; }
    .children { list-style: none; padding: 0; margin: 0; }
    .item { padding: 0.3rem 0; display: flex; align-items: baseline; gap: 0.5rem; border-bottom: 1px solid #1e1e2e; }
    .item:last-child { border-bottom: none; }
    .name { color: #e2e2e2; }
    .deps { font-size: 0.8rem; color: #9ca3af; margin-left: 0.5rem; }
    .empty { color: #555; font-style: italic; font-size: 0.85rem; margin: 0.25rem 0 0 0; }
    .no-graph { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <h1>DI Graph</h1>
  <nav>
    <a href=".">Index</a>
    <a href="graph.json">graph.json</a>
    <a href="profile">Profile</a>
    <a href="profile.json">profile.json</a>
  </nav>
  <p style="color:#6b7280;font-size:0.85rem">${graph.nodes.length} nodes &bull; ${graph.edges.length} edges</p>
  ${isEmpty ? '<p class="no-graph">No modules found in the DI graph.</p>' : moduleBlocks}
</body>
</html>`
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
