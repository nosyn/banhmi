/**
 * A view engine that renders templates to HTML strings.
 *
 * @example
 * const engine: ViewEngine = etaEngine({ viewsDir: './views' })
 * const html = await engine.render('hello', { name: 'world' })
 */
export type ViewEngine = {
  /**
   * Render a named template with the given locals.
   *
   * @param template - Template name (without extension).
   * @param locals - Data passed to the template.
   * @returns Rendered HTML string.
   */
  render(template: string, locals: Record<string, unknown>): Promise<string>
}

/**
 * Configuration options for {@link MvcModule.forRoot}.
 *
 * @example
 * MvcModule.forRoot({ engine: etaEngine({ viewsDir: './views' }) })
 */
export type MvcOptions = {
  /** The view engine to use for rendering templates. */
  engine: ViewEngine
  /**
   * Default directory where templates are found.
   * May also be configured in the engine itself.
   */
  viewsDir?: string
  /** Optional layouts directory for template inheritance. */
  layoutsDir?: string
}
