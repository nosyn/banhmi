import { Token } from '@banhmi/common'
import type { Transport } from './types'

/**
 * DI token for the active {@link Transport} instance.
 *
 * @example
 * static inject = [MS_TRANSPORT_TOKEN] as const
 */
export const MS_TRANSPORT_TOKEN = Token<Transport>('banhmi:ms_transport')

/**
 * Symbol key used to store `@MessagePattern` metadata in `Symbol.metadata`.
 *
 * Value shape: `Record<methodName, patternString>`
 *
 * @example
 * const map = (MyClass[Symbol.metadata] ?? {})[MESSAGE_PATTERN_METADATA]
 */
export const MESSAGE_PATTERN_METADATA: unique symbol = Symbol(
  'banhmi:ms_message_pattern',
)

/**
 * Symbol key used to store `@EventPattern` metadata in `Symbol.metadata`.
 *
 * Value shape: `Record<methodName, patternString>`
 *
 * @example
 * const map = (MyClass[Symbol.metadata] ?? {})[EVENT_PATTERN_METADATA]
 */
export const EVENT_PATTERN_METADATA: unique symbol = Symbol(
  'banhmi:ms_event_pattern',
)

/**
 * Symbol key reserved for future `@Payload` parameter-index metadata.
 *
 * @remarks
 * TC39 Stage 3 parameter decorators do not write to `Symbol.metadata` in
 * Bun 1.3.x.  The explorer uses the calling convention
 * `handler(payload, messageContext)` instead.  This symbol is exported for
 * API completeness; it is not written at runtime.
 *
 * @example
 * const map = (MyClass[Symbol.metadata] ?? {})[PAYLOAD_METADATA]
 */
export const PAYLOAD_METADATA: unique symbol = Symbol('banhmi:ms_payload')

/**
 * Symbol key reserved for future `@Ctx` parameter-index metadata.
 *
 * @remarks
 * TC39 Stage 3 parameter decorators do not write to `Symbol.metadata` in
 * Bun 1.3.x.  The explorer uses the calling convention
 * `handler(payload, messageContext)` instead.  This symbol is exported for
 * API completeness; it is not written at runtime.
 *
 * @example
 * const map = (MyClass[Symbol.metadata] ?? {})[CTX_METADATA]
 */
export const CTX_METADATA: unique symbol = Symbol('banhmi:ms_ctx')
