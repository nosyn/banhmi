/**
 * Symbol key used to store `@Processor` metadata on a class via
 * `Symbol.metadata`.
 *
 * The stored value is the queue name string.
 *
 * @example
 * const name = (MyProcessor[Symbol.metadata] ?? {})[PROCESSOR_METADATA]
 */
export const PROCESSOR_METADATA: unique symbol = Symbol('banhmi:processor')

/**
 * Symbol key used to store `@Process` handler entries on a class via
 * `Symbol.metadata`.
 *
 * The stored value is `Array<ProcessHandlerEntry>`.
 *
 * @example
 * const entries = (MyProcessor[Symbol.metadata] ?? {})[PROCESS_METADATA]
 */
export const PROCESS_METADATA: unique symbol = Symbol('banhmi:process')

/**
 * Metadata entry for a `@Process`-decorated method.
 */
export type ProcessHandlerEntry = {
  /** Method name on the class. */
  methodName: string
  /**
   * Job name this handler processes. If `undefined`, the handler catches all
   * jobs that don't match a named handler (catch-all).
   */
  jobName: string | undefined
}
