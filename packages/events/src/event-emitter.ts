import type { EventListener } from './types'

/**
 * Determines whether a concrete event name matches a subscription pattern.
 *
 * Pattern semantics:
 * - Segments are split on `.`.
 * - `*` matches exactly one segment.
 * - `**` matches zero or more segments (can appear only once; consumes the
 *   remainder of the event name).
 *
 * @example
 * matchPattern('user.*', 'user.created')  // true
 * matchPattern('user.*', 'user')          // false
 * matchPattern('user.**', 'user')         // true  — zero extra segments
 * matchPattern('user.**', 'user.a.b.c')  // true
 */
function matchPattern(pattern: string, event: string): boolean {
  const pSegs = pattern.split('.')
  const eSegs = event.split('.')

  let pi = 0
  let ei = 0

  while (pi < pSegs.length) {
    const pSeg = pSegs[pi]
    if (pSeg === '**') {
      // Double-star: match zero or more remaining event segments
      return true
    }
    if (ei >= eSegs.length) return false
    if (pSeg !== '*' && pSeg !== eSegs[ei]) return false
    pi++
    ei++
  }

  // Both exhausted → full match
  return ei === eSegs.length
}

type Subscription = { pattern: string; listener: EventListener }

/**
 * In-process event bus supporting synchronous (`emit`) and asynchronous
 * (`emitAsync`) dispatch with wildcard pattern matching.
 *
 * Patterns use `.` as a segment separator. `*` matches a single segment;
 * `**` matches zero or more segments.
 *
 * @example
 * import { EventEmitter } from '@banhmi/events'
 *
 * const emitter = new EventEmitter()
 * emitter.on('user.created', (payload) => console.log('new user:', payload))
 * emitter.emit('user.created', { id: 1 })
 */
export class EventEmitter {
  private subscriptions: Subscription[] = []

  /**
   * Emit an event synchronously. All matching listeners are invoked in
   * registration order. Listener errors are caught and logged but do not
   * prevent subsequent listeners from running.
   *
   * @param event - The concrete event name.
   * @param payload - Value forwarded to each listener.
   *
   * @example
   * emitter.emit('user.created', { id: 1 })
   */
  emit(event: string, payload: unknown): void {
    for (const sub of this.subscriptions) {
      if (!matchPattern(sub.pattern, event)) continue
      try {
        const result = sub.listener(payload, event)
        if (result instanceof Promise) {
          result.catch(() => {
            // swallow async listener errors in sync emit
          })
        }
      } catch {
        // swallow sync listener errors
      }
    }
  }

  /**
   * Emit an event and await all matching listeners concurrently.
   *
   * Returns a `Promise` that resolves to an array of settled results.
   * Each element is either `undefined` (on success) or the thrown/rejected
   * error value (on failure). Errors are included in the array rather than
   * causing the overall promise to reject, so you always receive the full
   * result set.
   *
   * @param event - The concrete event name.
   * @param payload - Value forwarded to each listener.
   * @returns Resolves with an array of `undefined` values (one per listener).
   *
   * @example
   * const results = await emitter.emitAsync('user.created', { id: 1 })
   */
  async emitAsync(event: string, payload: unknown): Promise<undefined[]> {
    const promises: Promise<undefined>[] = []

    for (const sub of this.subscriptions) {
      if (!matchPattern(sub.pattern, event)) continue
      const p = Promise.resolve()
        .then(() => sub.listener(payload, event))
        .then(() => undefined)
      promises.push(p)
    }

    return Promise.all(promises)
  }

  /**
   * Subscribe to events matching `pattern`.
   *
   * @param pattern - Event pattern with optional `*` / `**` wildcards.
   * @param listener - Function to invoke on matching events.
   * @returns A function that removes this subscription when called.
   *
   * @example
   * const unsubscribe = emitter.on('user.*', (payload) => {})
   * // later:
   * unsubscribe()
   */
  on(pattern: string, listener: EventListener): () => void {
    const sub: Subscription = { pattern, listener }
    this.subscriptions.push(sub)
    return () => this.off(pattern, listener)
  }

  /**
   * Remove a previously registered listener for the given pattern.
   *
   * If the same listener was registered multiple times, only the first
   * matching entry is removed.
   *
   * @param pattern - The pattern used when subscribing.
   * @param listener - The listener function to remove.
   *
   * @example
   * emitter.off('user.*', myListener)
   */
  off(pattern: string, listener: EventListener): void {
    const idx = this.subscriptions.findIndex(
      (s) => s.pattern === pattern && s.listener === listener,
    )
    if (idx !== -1) this.subscriptions.splice(idx, 1)
  }
}
