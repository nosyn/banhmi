import { Token } from '@banhmi/common'
import type { EventEmitter } from './event-emitter'

/**
 * DI token for the {@link EventEmitter} instance registered by
 * {@link EventEmitterModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [EVENT_EMITTER_TOKEN] as const
 *   constructor(private readonly emitter: EventEmitter) {}
 * }
 */
export const EVENT_EMITTER_TOKEN = Token<EventEmitter>('EVENT_EMITTER')
