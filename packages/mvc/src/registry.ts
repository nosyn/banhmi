import type { ViewEngine } from './types'

/**
 * Module-scope registry for the active view engine.
 *
 * `MvcModule.forRoot()` registers the engine here during bootstrap so that
 * the `@Render` decorator can resolve it at handler invocation time without
 * requiring DI injection at decoration time.
 *
 * @internal
 */
let _activeEngine: ViewEngine | null = null

/**
 * Register a view engine as the active engine.
 *
 * Called internally by `MvcBootstrapService.onApplicationBootstrap()`.
 *
 * @internal
 */
export function registerEngine(engine: ViewEngine): void {
  _activeEngine = engine
}

/**
 * Retrieve the currently registered view engine, or `null` if none is set.
 *
 * @internal
 */
export function getActiveEngine(): ViewEngine | null {
  return _activeEngine
}
