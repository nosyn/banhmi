import { Token } from '@banhmi/common'
import type { QueueOptions } from './types'

/**
 * DI token for the global queue options array registered by
 * {@link QueueModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [QUEUE_OPTIONS] as const
 *   constructor(private readonly opts: QueueOptions[]) {}
 * }
 */
export const QUEUE_OPTIONS = Token<QueueOptions[]>('QUEUE_OPTIONS')

/**
 * Factory that creates a DI token for a named {@link Queue} instance.
 * Used internally by {@link InjectQueue}.
 *
 * @param name - Queue name.
 *
 * @example
 * const token = getQueueToken('emails')
 */
export function getQueueToken(name: string): symbol {
  return Symbol.for(`banhmi:queue:${name}`)
}
