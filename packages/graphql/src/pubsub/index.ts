/**
 * PubSub interface for GraphQL subscriptions.
 *
 * @example
 * // Inject into a resolver:
 * static inject = [InMemoryPubSub] as const
 * constructor(private pubsub: PubSub) {}
 *
 * // Publish:
 * await this.pubsub.publish('cats.created', { cat })
 *
 * // Subscribe (in a @Subscription resolver):
 * return this.pubsub.asyncIterator('cats.created')
 */
export interface PubSub {
  /**
   * Publish a payload to a topic.
   *
   * @param topic - Topic name.
   * @param payload - The event payload.
   */
  publish(topic: string, payload: unknown): Promise<void>

  /**
   * Return an async iterable that yields events published to the given topics.
   *
   * @param topics - One or more topic strings to subscribe to.
   */
  asyncIterator(topics: string | string[]): AsyncIterable<unknown>
}

type Listener = (payload: unknown) => void

/**
 * Simple in-memory {@link PubSub} implementation backed by a Map of listeners.
 *
 * Suitable for single-process use. For multi-process use, swap in the
 * `RedisPubSub` adapter from `@banhmi/redis`.
 *
 * @example
 * const pubsub = new InMemoryPubSub()
 * const iter = pubsub.asyncIterator('cats.created')
 * await pubsub.publish('cats.created', { name: 'Garfield' })
 * for await (const event of iter) { console.log(event) }
 */
export class InMemoryPubSub implements PubSub {
  private listeners = new Map<string, Set<Listener>>()

  /**
   * Publish an event to all subscribers of the given topic.
   *
   * @param topic - Topic to publish to.
   * @param payload - Event payload.
   */
  async publish(topic: string, payload: unknown): Promise<void> {
    const subs = this.listeners.get(topic)
    if (!subs) return
    for (const fn of subs) {
      fn(payload)
    }
  }

  /**
   * Return an async iterable that yields events for the given topics.
   *
   * @param topics - Topic or topics to subscribe to.
   */
  asyncIterator(topics: string | string[]): AsyncIterable<unknown> {
    const topicList = Array.isArray(topics) ? topics : [topics]
    const queue: unknown[] = []
    let resolve: (() => void) | null = null
    let done = false

    const listener: Listener = (payload) => {
      queue.push(payload)
      resolve?.()
      resolve = null
    }

    for (const topic of topicList) {
      let subs = this.listeners.get(topic)
      if (!subs) {
        subs = new Set()
        this.listeners.set(topic, subs)
      }
      subs.add(listener)
    }

    const cleanup = () => {
      done = true
      for (const topic of topicList) {
        this.listeners.get(topic)?.delete(listener)
      }
    }

    return {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<unknown>> {
            if (queue.length > 0) {
              return Promise.resolve({ value: queue.shift(), done: false })
            }
            if (done) {
              return Promise.resolve({ value: undefined, done: true })
            }
            return new Promise((res) => {
              resolve = () => {
                if (queue.length > 0) {
                  res({ value: queue.shift(), done: false })
                } else {
                  res({ value: undefined, done: true })
                }
              }
            })
          },
          return(): Promise<IteratorResult<unknown>> {
            cleanup()
            return Promise.resolve({ value: undefined, done: true })
          },
        }
      },
    }
  }
}
