/**
 * A listener function invoked when an event matching the subscribed pattern
 * is emitted.
 *
 * @param payload - The value passed to {@link EventEmitter.emit}.
 * @param eventName - The concrete event name that triggered the listener
 *   (useful when subscribing to a wildcard pattern).
 *
 * @example
 * const listener: EventListener = (payload, name) => {
 *   console.log(name, payload)
 * }
 */
export type EventListener = (
  payload: unknown,
  eventName: string,
) => void | Promise<void>

/**
 * Options for the {@link OnEvent} method decorator.
 *
 * @example
 * \@OnEvent('user.created', { suppressErrors: true })
 * async handleUserCreated(payload: unknown) {}
 */
export type OnEventOptions = {
  /**
   * When `true`, errors thrown by the decorated method are suppressed rather
   * than propagated to the emitter. Defaults to `false`.
   */
  suppressErrors?: boolean
}
