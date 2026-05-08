import type { ClassConstructor } from '@banhmi/common'
import { EVENT_PATTERN_METADATA, MESSAGE_PATTERN_METADATA } from './tokens'
import type { MicroserviceMessage, MicroserviceResponse } from './types'

/**
 * A resolved handler registration produced by {@link MicroserviceExplorer}.
 */
export interface HandlerRegistration {
  /** The pattern this handler responds to. */
  pattern: string
  /** Whether this is a fire-and-forget event (no response) or request/reply. */
  isEvent: boolean
  /**
   * Invoke the handler with the given message.
   *
   * The handler is called with `(payload, message)` where `payload` is
   * `message.data` (first arg) and `message` is the full envelope (second
   * arg).  `@Payload()` and `@Ctx()` are documentation-only decorators.
   *
   * @param msg - The inbound message envelope.
   * @returns The response envelope, or `undefined` for event handlers.
   */
  invoke(msg: MicroserviceMessage): Promise<MicroserviceResponse | undefined>
}

/**
 * Scans provider instances for methods decorated with `@MessagePattern` or
 * `@EventPattern` and produces {@link HandlerRegistration} objects consumed
 * by the microservice server.
 *
 * Handler calling convention: `handler(payload, messageContext)`.
 * - First argument: `msg.data` (the payload).
 * - Second argument: the full `MicroserviceMessage` envelope.
 *
 * @example
 * const explorer = new MicroserviceExplorer()
 * const handlers = explorer.explore([[instance, MyHandler]])
 */
export class MicroserviceExplorer {
  /**
   * Walk all supplied `[instance, class]` pairs and extract handler
   * registrations.
   *
   * @param pairs - Array of `[instance, ClassConstructor]` tuples to inspect.
   * @returns Flat list of all discovered {@link HandlerRegistration}s.
   *
   * @example
   * const handlers = explorer.explore([[serviceInstance, MyService]])
   */
  explore(pairs: Array<[object, ClassConstructor]>): HandlerRegistration[] {
    const registrations: HandlerRegistration[] = []

    for (const [instance, cls] of pairs) {
      const classMeta = cls[Symbol.metadata] as Record<symbol, unknown> | null
      if (!classMeta) continue

      const msgMap =
        (classMeta[MESSAGE_PATTERN_METADATA] as
          | Record<string, string>
          | undefined) ?? {}
      const evtMap =
        (classMeta[EVENT_PATTERN_METADATA] as
          | Record<string, string>
          | undefined) ?? {}

      for (const [methodName, pattern] of Object.entries(msgMap)) {
        const fn = (instance as Record<string, unknown>)[methodName]
        if (typeof fn !== 'function') continue
        registrations.push(
          this.buildRegistration(
            instance,
            fn as (...args: unknown[]) => unknown,
            pattern,
            false,
          ),
        )
      }

      for (const [methodName, pattern] of Object.entries(evtMap)) {
        const fn = (instance as Record<string, unknown>)[methodName]
        if (typeof fn !== 'function') continue
        registrations.push(
          this.buildRegistration(
            instance,
            fn as (...args: unknown[]) => unknown,
            pattern,
            true,
          ),
        )
      }
    }

    return registrations
  }

  private buildRegistration(
    instance: object,
    fn: (...args: unknown[]) => unknown,
    pattern: string,
    isEvent: boolean,
  ): HandlerRegistration {
    return {
      pattern,
      isEvent,
      invoke: async (msg: MicroserviceMessage) => {
        try {
          // Convention: handler(payload, messageContext)
          const result = await Promise.resolve(fn.call(instance, msg.data, msg))

          if (isEvent) return undefined
          return { data: result }
        } catch (err) {
          if (isEvent) return undefined
          const message = err instanceof Error ? err.message : String(err)
          let status = 500
          if (err !== null && typeof err === 'object') {
            if (
              'statusCode' in err &&
              typeof (err as { statusCode: unknown }).statusCode === 'number'
            ) {
              status = (err as { statusCode: number }).statusCode
            } else if (
              'status' in err &&
              typeof (err as { status: unknown }).status === 'number'
            ) {
              status = (err as { status: number }).status
            }
          }
          return { error: { message, status } }
        }
      },
    }
  }
}
