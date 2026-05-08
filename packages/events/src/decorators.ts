import type { OnEventMetadataMap } from './metadata'
import { ON_EVENT_METADATA } from './metadata'
import type { OnEventOptions } from './types'

/**
 * Method decorator that registers the decorated method as an event listener
 * at application bootstrap.
 *
 * The event `pattern` is stored in `Symbol.metadata` and read by
 * {@link EventsExplorer} during `onApplicationBootstrap`. The explorer
 * registers the method on the global {@link EventEmitter} from DI.
 *
 * Patterns support `.`-separated segments. Use `*` to match a single
 * segment and `**` to match zero or more segments.
 *
 * @param pattern - Event pattern to subscribe to.
 * @param _opts - Reserved for future use (e.g. `suppressErrors`).
 *
 * @example
 * import { Injectable } from 'banhmi'
 * import { OnEvent } from '@banhmi/events'
 *
 * \@Injectable()
 * class NotificationService {
 *   \@OnEvent('user.*')
 *   handleUserEvent(payload: unknown, eventName: string) {
 *     console.log(eventName, payload)
 *   }
 * }
 */
export function OnEvent(pattern: string, _opts?: OnEventOptions) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const methodName = context.name as string
    const existing =
      (context.metadata[ON_EVENT_METADATA] as OnEventMetadataMap | undefined) ??
      {}
    context.metadata[ON_EVENT_METADATA] = {
      ...existing,
      [methodName]: pattern,
    }
  }
}
