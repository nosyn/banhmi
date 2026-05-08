import { Token } from '@banhmi/common'
import type { CommandBus } from './command-bus'
import type { EventBus } from './event-bus'
import type { QueryBus } from './query-bus'

/**
 * DI token for the {@link CommandBus} singleton.
 *
 * @example
 * class MyController {
 *   static inject = [COMMAND_BUS_TOKEN] as const
 *   constructor(private commandBus: CommandBus) {}
 * }
 */
export const COMMAND_BUS_TOKEN = Token<CommandBus>('COMMAND_BUS')

/**
 * DI token for the {@link QueryBus} singleton.
 *
 * @example
 * class MyController {
 *   static inject = [QUERY_BUS_TOKEN] as const
 *   constructor(private queryBus: QueryBus) {}
 * }
 */
export const QUERY_BUS_TOKEN = Token<QueryBus>('QUERY_BUS')

/**
 * DI token for the {@link EventBus} singleton.
 *
 * @example
 * class MyController {
 *   static inject = [EVENT_BUS_TOKEN] as const
 *   constructor(private eventBus: EventBus) {}
 * }
 */
export const EVENT_BUS_TOKEN = Token<EventBus>('EVENT_BUS')
