import type { ClassConstructor } from '@banhmi/common'
import type { EventEmitter } from './event-emitter'
import type { OnEventMetadataMap } from './metadata'
import { ON_EVENT_METADATA } from './metadata'

/**
 * Walks a list of provider/controller instances and their classes to find
 * methods decorated with `@OnEvent`, then registers them on the given
 * {@link EventEmitter}.
 *
 * Called by {@link EventsExplorerService} during `onApplicationBootstrap`.
 *
 * @example
 * const explorer = new EventsExplorer()
 * explorer.explore(emitter, [[instance, MyClass]])
 */
export class EventsExplorer {
  /**
   * Register all `@OnEvent`-decorated methods found in the supplied pairs.
   *
   * @param emitter - The global {@link EventEmitter} to register on.
   * @param pairs - Array of `[instance, ClassConstructor]` tuples to inspect.
   */
  explore(
    emitter: EventEmitter,
    pairs: Array<[object, ClassConstructor]>,
  ): void {
    for (const [instance, cls] of pairs) {
      const classMeta = cls[Symbol.metadata] as Record<symbol, unknown> | null
      if (!classMeta) continue

      const map = classMeta[ON_EVENT_METADATA] as OnEventMetadataMap | undefined
      if (!map) continue

      for (const [methodName, pattern] of Object.entries(map)) {
        const fn = (instance as Record<string, unknown>)[methodName]
        if (typeof fn !== 'function') continue
        emitter.on(pattern, (payload, eventName) =>
          (fn as (p: unknown, e: string) => unknown).call(
            instance,
            payload,
            eventName,
          ),
        )
      }
    }
  }
}
