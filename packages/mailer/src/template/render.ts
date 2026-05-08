import type { MailerOptions } from '../types'

/**
 * Render an email template using the configured engine.
 *
 * Reads `<templateDir>/<name>.eta` (or `.edge`) and renders it with the
 * supplied context.
 *
 * @param name - Template name without extension.
 * @param context - Template locals/data.
 * @param opts - Mailer options containing `templateDir` and `templateEngine`.
 * @returns Rendered HTML string.
 * @throws When `templateDir` is not configured or the template file is missing.
 *
 * @example
 * const html = await renderTemplate('welcome', { name: 'Alice' }, mailerOpts)
 */
export async function renderTemplate(
  name: string,
  context: Record<string, unknown>,
  opts: MailerOptions,
): Promise<string> {
  if (!opts.templateDir) {
    throw new Error(
      '@banhmi/mailer: templateDir is required to use template rendering',
    )
  }

  const engine = opts.templateEngine ?? 'eta'

  if (engine === 'eta') {
    let EtaClass: new (
      config: Record<string, unknown>,
    ) => {
      renderFile(path: string, data: Record<string, unknown>): Promise<string>
    }
    try {
      const mod = await import('eta')
      EtaClass = mod.Eta
    } catch {
      throw new Error('@banhmi/mailer: eta is not installed. Run: bun add eta')
    }

    const eta = new EtaClass({ views: opts.templateDir, cache: false })
    const result = await eta.renderFile(name, context)
    if (!result) {
      throw new Error(
        `@banhmi/mailer: template '${name}' not found in '${opts.templateDir}'`,
      )
    }
    return result
  }

  if (engine === 'edge') {
    try {
      const mod = await import('edge.js')
      const edge = mod.edge ?? mod.default
      edge.mount(opts.templateDir)
      return await edge.render(name, context)
    } catch {
      throw new Error(
        '@banhmi/mailer: edge.js is not installed. Run: bun add edge.js',
      )
    }
  }

  throw new Error(`@banhmi/mailer: unsupported templateEngine '${engine}'`)
}
