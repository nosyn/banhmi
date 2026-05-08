/**
 * Symbol key used to store per-method `@OnEvent` patterns in
 * `Symbol.metadata`.
 *
 * The stored value is `Record<string, string>` mapping method name → event
 * pattern.
 *
 * @example
 * const map = (MyClass[Symbol.metadata] ?? {})[ON_EVENT_METADATA]
 * // → { handleUserCreated: 'user.created' }
 */
export const ON_EVENT_METADATA: unique symbol = Symbol('banhmi:on_event')

/**
 * The shape stored at `ON_EVENT_METADATA` in `Symbol.metadata`.
 *
 * Maps method name → event pattern string.
 */
export type OnEventMetadataMap = Record<string, string>
