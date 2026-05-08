/**
 * @banhmi/cqrs — Command/Query/Event buses and Sagas for Banhmi.
 *
 * Provides `CqrsModule` to register all buses, decorators `@CommandHandler`,
 * `@QueryHandler`, `@EventsHandler`, and `@Saga` for declaring handlers, and
 * `CommandBus`, `QueryBus`, `EventBus` for dispatching.
 *
 * @example
 * import { Module } from 'banhmi'
 * import { CqrsModule, CommandBus, CommandHandler } from '@banhmi/cqrs'
 *
 * \@CommandHandler(CreateUserCommand)
 * class CreateUserHandler {
 *   async execute(cmd: CreateUserCommand) { return cmd.name }
 * }
 *
 * \@Module({ imports: [CqrsModule], providers: [CreateUserHandler] })
 * class AppModule {}
 */

export { CommandBus } from './command-bus'
export { CqrsModule } from './cqrs.module'
export {
  COMMAND_HANDLER_META,
  CommandHandler,
  EVENTS_HANDLER_META,
  EventsHandler,
  QUERY_HANDLER_META,
  QueryHandler,
  SAGA_META,
  Saga,
} from './decorators'
export { EventBus } from './event-bus'
export { CqrsExplorer } from './explorer'
export { QueryBus } from './query-bus'
export {
  COMMAND_BUS_TOKEN,
  EVENT_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from './tokens'
export type {
  ICommand,
  ICommandHandler,
  IEvent,
  IEventHandler,
  IQuery,
  IQueryHandler,
} from './types'
