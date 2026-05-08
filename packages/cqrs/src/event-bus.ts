import type { ClassConstructor } from '@banhmi/common'
import type { IEvent, IEventHandler } from './types'

/**
 * Central bus for publishing events to their registered handlers.
 *
 * @example
 * import { EventBus } from '@banhmi/cqrs'
 *
 * class UserService {
 *   static inject = [EventBus] as const
 *   constructor(private eventBus: EventBus) {}
 *
 *   async createUser(name: string) {
 *     const userId = await db.createUser(name)
 *     await this.eventBus.publish(new UserCreatedEvent(userId))
 *   }
 * }
 */
export class EventBus {
  private readonly handlers = new Map<ClassConstructor, IEventHandler[]>()
  /** Async iterators registered by sagas for a given event class. */
  private readonly iterators = new Map<
    ClassConstructor,
    Array<{
      push: (event: IEvent) => void
      done: () => void
    }>
  >()

  /**
   * Register a handler for an event class.
   *
   * @param eventClass - The event class to listen for.
   * @param handler - The handler instance.
   *
   * @internal
   */
  register(eventClass: ClassConstructor, handler: IEventHandler): void {
    const existing = this.handlers.get(eventClass) ?? []
    this.handlers.set(eventClass, [...existing, handler])
  }

  /**
   * Publish an event to all registered handlers.
   *
   * Runs all handlers in parallel. Also pushes the event to any active
   * saga iterators subscribed to this event class.
   *
   * @param event - The event to publish.
   *
   * @example
   * await eventBus.publish(new UserCreatedEvent('user-123'))
   */
  async publish(event: IEvent): Promise<void> {
    const eventClass = event.constructor as ClassConstructor
    const handlers = this.handlers.get(eventClass) ?? []
    await Promise.all(handlers.map((h) => h.handle(event)))

    // Notify saga iterators
    const iters = this.iterators.get(eventClass) ?? []
    for (const iter of iters) {
      iter.push(event)
    }
  }

  /**
   * Create an async iterable that yields events of the given class.
   * Used by the saga runner to subscribe to event streams.
   *
   * @param eventClass - The event class to subscribe to.
   * @returns An async iterable of events.
   *
   * @internal
   */
  subscribe(eventClass: ClassConstructor): AsyncIterable<IEvent> {
    const queue: IEvent[] = []
    let resolve: ((value: IteratorResult<IEvent>) => void) | null = null
    let isDone = false

    const iter = {
      push: (event: IEvent) => {
        if (resolve) {
          const r = resolve
          resolve = null
          r({ value: event, done: false })
        } else {
          queue.push(event)
        }
      },
      done: () => {
        isDone = true
        if (resolve) {
          resolve({ value: undefined as unknown as IEvent, done: true })
        }
      },
    }

    const existing = this.iterators.get(eventClass) ?? []
    this.iterators.set(eventClass, [...existing, iter])

    return {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<IEvent>> {
            if (queue.length > 0) {
              const value = queue.shift()
              return Promise.resolve({ value: value as IEvent, done: false })
            }
            if (isDone) {
              return Promise.resolve({
                value: undefined as unknown as IEvent,
                done: true,
              })
            }
            return new Promise((res) => {
              resolve = res
            })
          },
          return(): Promise<IteratorResult<IEvent>> {
            isDone = true
            return Promise.resolve({
              value: undefined as unknown as IEvent,
              done: true,
            })
          },
        }
      },
    }
  }
}
