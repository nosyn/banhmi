import type { ViewEngine } from '../types'

/**
 * Options for the Eta view engine.
 *
 * @example
 * etaEngine({ viewsDir: './views', layoutsDir: './views/layouts' })
 */
export type EtaEngineOptions = {
  /** Directory where `.eta` template files are stored. */
  viewsDir: string
  /** Optional directory for layout files. */
  layoutsDir?: string
}

/**
 * Create a {@link ViewEngine} backed by the `eta` template engine.
 *
 * Eta is lazy-imported on first use; if the `eta` package is not installed,
 * calling `render()` will throw a clear error.
 *
 * @param opts - Engine options.
 * @returns A {@link ViewEngine} instance.
 *
 * @example
 * import { etaEngine } from '@banhmi/mvc'
 *
 * MvcModule.forRoot({ engine: etaEngine({ viewsDir: './views' }) })
 */
export function etaEngine(opts: EtaEngineOptions): ViewEngine {
  let etaInstance: {
    renderFile(path: string, data: Record<string, unknown>): Promise<string>
  } | null = null

  async function getEta() {
    if (etaInstance) return etaInstance
    let EtaClass: new (config: Record<string, unknown>) => typeof etaInstance
    try {
      const mod = await import('eta')
      EtaClass = mod.Eta
    } catch {
      throw new Error('@banhmi/mvc: eta is not installed. Run: bun add eta')
    }
    etaInstance = new EtaClass({
      views: opts.viewsDir,
      cache: false,
    }) as typeof etaInstance
    return etaInstance
  }

  return {
    async render(
      template: string,
      locals: Record<string, unknown>,
    ): Promise<string> {
      const eta = await getEta()
      const result = await eta.renderFile(template, locals)
      if (result === undefined || result === null) {
        throw new Error(
          `@banhmi/mvc: template '${template}' not found in '${opts.viewsDir}'`,
        )
      }
      return result
    },
  }
}
