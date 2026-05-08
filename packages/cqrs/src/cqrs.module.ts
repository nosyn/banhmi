import { Module } from '@banhmi/common'
import { CommandBus } from './command-bus'
import { EventBus } from './event-bus'
import { CqrsExplorer } from './explorer'
import { QueryBus } from './query-bus'
import { COMMAND_BUS_TOKEN, EVENT_BUS_TOKEN, QUERY_BUS_TOKEN } from './tokens'

/**
 * Module that registers the CQRS buses and wires up all decorated handlers
 * at application bootstrap.
 *
 * Import `CqrsModule` in your root or feature module, then register your
 * command/query/event handlers as providers in the same module.
 *
 * @example
 * import { Module } from 'banhmi'
 * import { CqrsModule, CommandHandler } from '@banhmi/cqrs'
 *
 * \@CommandHandler(CreateUserCommand)
 * class CreateUserHandler {
 *   async execute(cmd: CreateUserCommand) { return 'ok' }
 * }
 *
 * \@Module({
 *   imports: [CqrsModule],
 *   providers: [CreateUserHandler],
 * })
 * class AppModule {}
 */
@Module({
  providers: [
    CommandBus,
    QueryBus,
    EventBus,
    { provide: COMMAND_BUS_TOKEN, useClass: CommandBus },
    { provide: QUERY_BUS_TOKEN, useClass: QueryBus },
    { provide: EVENT_BUS_TOKEN, useClass: EventBus },
    CqrsExplorer,
  ],
  exports: [
    CommandBus,
    QueryBus,
    EventBus,
    COMMAND_BUS_TOKEN,
    QUERY_BUS_TOKEN,
    EVENT_BUS_TOKEN,
  ],
})
export class CqrsModule {}
