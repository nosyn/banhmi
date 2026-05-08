import type { ViewEngine } from '../types'

/**
 * Options for the Edge.js view engine.
 *
 * @example
 * edgeEngine({ viewsDir: './views' })
 */
export type EdgeEngineOptions = {
  /** Directory where Edge template files are stored. */
  viewsDir: string
  /** Optional directory for component files. */
  componentsDir?: string
}

/**
 * Create a {@link ViewEngine} backed by the `edge.js` template engine.
 *
 * Edge.js is lazy-imported on first use; if the package is not installed,
 * calling `render()` will throw a clear error. This is an interface stub —
 * the full Edge.js feature set (components, tags) is available when the
 * peer dep is present.
 *
 * @param opts - Engine options.
 * @returns A {@link ViewEngine} instance.
 *
 * @example
 * import { edgeEngine } from '@banhmi/mvc'
 *
 * MvcModule.forRoot({ engine: edgeEngine({ viewsDir: './views' }) })
 */
export function edgeEngine(opts: EdgeEngineOptions): ViewEngine {
  let edgeInstance: {
    mount(dir: string): void
    render(template: string, data: Record<string, unknown>): Promise<string>
  } | null = null

  async function getEdge() {
    if (edgeInstance) return edgeInstance
    try {
      const mod = await import('edge.js')
      const edge = mod.edge ?? mod.default
      edge.mount(opts.viewsDir)
      edgeInstance = edge
      return edgeInstance
    } catch {
      throw new Error(
        '@banhmi/mvc: edge.js is not installed. Run: bun add edge.js',
      )
    }
  }

  return {
    async render(
      template: string,
      locals: Record<string, unknown>,
    ): Promise<string> {
      const edge = await getEdge()
      return edge.render(template, locals)
    },
  }
}
