/**
 * Options accepted by {@link createEdgeHandler}.
 *
 * @example
 * const handler = await createEdgeHandler(AppModule, { globalPrefix: 'api' })
 */
export interface EdgeHandlerOptions {
  /**
   * Optional global URL prefix.  When set, the handler prepends it to all
   * incoming request paths before routing so that routes registered at `/cats`
   * still match requests arriving at `/api/cats`.
   *
   * @example
   * { globalPrefix: 'api' }
   */
  globalPrefix?: string
}
