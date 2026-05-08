import type { ClassConstructor } from '@banhmi/common'
import type { CommandBus } from './command-bus'
import type { EventBus } from './event-bus'
import type { ICommand } from './types'

/**
 * Run a saga method that is an async generator.
 *
 * The saga subscribes to events from the {@link EventBus}, yields commands,
 * and those commands are dispatched on the {@link CommandBus}.
 *
 * @param sagaFn - The async generator method (bound to the saga class instance).
 * @param eventClass - The event class the saga subscribes to.
 * @param commandBus - The command bus to dispatch yielded commands on.
 * @param eventBus - The event bus to subscribe to.
 *
 * @internal
 */
export function runSaga(
  sagaFn: (events: AsyncIterable<unknown>) => AsyncGenerator<ICommand>,
  eventClass: ClassConstructor,
  commandBus: CommandBus,
  eventBus: EventBus,
): void {
  const events = eventBus.subscribe(eventClass)

  async function loop() {
    const generator = sagaFn(events)
    for await (const command of generator) {
      try {
        await commandBus.execute(command)
      } catch (_err) {
        // Saga errors should not crash the loop; log and continue
      }
    }
  }

  // Fire-and-forget — the saga loop runs in the background
  loop().catch(() => undefined)
}
