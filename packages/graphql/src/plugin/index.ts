import type { ResolverContext } from '../types'

/**
 * Lifecycle context passed to plugin hooks.
 *
 * @example
 * const plugin: GraphQLPlugin = {
 *   requestDidStart({ request }) {
 *     console.log(`GraphQL request: ${request.url}`)
 *   }
 * }
 */
export interface PluginLifecycleContext {
  /** The incoming HTTP request. */
  request: Request
  /** The parsed GraphQL operation string, if available. */
  query?: string
  /** The operation name, if provided. */
  operationName?: string
  /** The resolver context. */
  context: ResolverContext
}

/**
 * Result context passed to `willSendResponse`.
 *
 * @example
 * const plugin: GraphQLPlugin = {
 *   willSendResponse({ result }) {
 *     console.log('Sending response with data:', result.data)
 *   }
 * }
 */
export interface PluginResponseContext extends PluginLifecycleContext {
  /** The execution result. */
  result: {
    data?: Record<string, unknown> | null
    errors?: unknown[]
    extensions?: Record<string, unknown>
  }
}

/**
 * A GraphQL plugin that hooks into the request lifecycle.
 *
 * @example
 * const timingPlugin: GraphQLPlugin = {
 *   requestDidStart({ request }) {
 *     const start = Date.now()
 *     return { start }
 *   },
 *   willSendResponse({ result }) {
 *     console.log('Request took', Date.now() - this.start, 'ms')
 *   }
 * }
 */
export interface GraphQLPlugin {
  /**
   * Called when a GraphQL request begins.
   *
   * @param ctx - The lifecycle context.
   */
  requestDidStart?: (ctx: PluginLifecycleContext) => void | Promise<void>

  /**
   * Called just before the response is sent.
   *
   * @param ctx - The response context including the execution result.
   */
  willSendResponse?: (ctx: PluginResponseContext) => void | Promise<void>
}

/**
 * Registry of registered plugins.
 * @internal
 */
const plugins: GraphQLPlugin[] = []

/**
 * Registers a GraphQL plugin.
 *
 * @param plugin - The plugin to register.
 *
 * @example
 * registerPlugin({
 *   requestDidStart({ request }) {
 *     console.log('Request started:', request.url)
 *   }
 * })
 */
export function registerPlugin(plugin: GraphQLPlugin): void {
  plugins.push(plugin)
}

/**
 * Get all registered plugins.
 * @internal
 */
export function getPlugins(): GraphQLPlugin[] {
  return [...plugins]
}

/**
 * Clears all registered plugins. Primarily useful in tests.
 *
 * @example
 * afterEach(() => clearPlugins())
 */
export function clearPlugins(): void {
  plugins.length = 0
}

/**
 * Runs all registered plugins' `requestDidStart` hook.
 *
 * @param ctx - The lifecycle context.
 *
 * @example
 * await runRequestDidStart({ request, query: '{ cats { id } }', context })
 */
export async function runRequestDidStart(
  ctx: PluginLifecycleContext,
): Promise<void> {
  for (const plugin of plugins) {
    await plugin.requestDidStart?.(ctx)
  }
}

/**
 * Runs all registered plugins' `willSendResponse` hook.
 *
 * @param ctx - The response context.
 *
 * @example
 * await runWillSendResponse({ ...lifecycleCtx, result })
 */
export async function runWillSendResponse(
  ctx: PluginResponseContext,
): Promise<void> {
  for (const plugin of plugins) {
    await plugin.willSendResponse?.(ctx)
  }
}
