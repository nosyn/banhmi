import { Token } from '@banhmi/common'
import type { ViewEngine } from './types'

/**
 * DI token for the registered {@link ViewEngine}.
 *
 * Injected by `MvcModule.forRoot()` and consumed by the `@Render` decorator.
 *
 * @example
 * class MyService {
 *   static inject = [VIEW_ENGINE_TOKEN] as const
 *   constructor(private engine: ViewEngine) {}
 * }
 */
export const VIEW_ENGINE_TOKEN = Token<ViewEngine>('VIEW_ENGINE')
