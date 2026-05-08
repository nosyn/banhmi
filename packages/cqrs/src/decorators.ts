import '@banhmi/common'
import type { ClassConstructor } from '@banhmi/common'

/** @internal Metadata key for command handler registration. */
export const COMMAND_HANDLER_META = Symbol('banhmi:cqrs:command-handler')
/** @internal Metadata key for query handler registration. */
export const QUERY_HANDLER_META = Symbol('banhmi:cqrs:query-handler')
/** @internal Metadata key for event handler registration. */
export const EVENTS_HANDLER_META = Symbol('banhmi:cqrs:events-handler')
/** @internal Metadata key for saga registration. */
export const SAGA_META = Symbol('banhmi:cqrs:saga')

/** @internal Shape stored under {@link COMMAND_HANDLER_META}. */
export type CommandHandlerMeta = {
  commandClass: ClassConstructor
}

/** @internal Shape stored under {@link QUERY_HANDLER_META}. */
export type QueryHandlerMeta = {
  queryClass: ClassConstructor
}

/** @internal Shape stored under {@link EVENTS_HANDLER_META}. */
export type EventsHandlerMeta = {
  eventClasses: ClassConstructor[]
}

/**
 * Class decorator that registers the decorated class as a command handler
 * for the given command class.
 *
 * @param commandClass - The command class this handler processes.
 *
 * @example
 * import { CommandHandler } from '@banhmi/cqrs'
 *
 * \@CommandHandler(CreateUserCommand)
 * class CreateUserHandler {
 *   async execute(command: CreateUserCommand) {
 *     return db.createUser(command)
 *   }
 * }
 */
export function CommandHandler(commandClass: ClassConstructor) {
  return (_target: unknown, context: ClassDecoratorContext): void => {
    const meta: CommandHandlerMeta = { commandClass }
    context.metadata[COMMAND_HANDLER_META] = meta
  }
}

/**
 * Class decorator that registers the decorated class as a query handler
 * for the given query class.
 *
 * @param queryClass - The query class this handler processes.
 *
 * @example
 * import { QueryHandler } from '@banhmi/cqrs'
 *
 * \@QueryHandler(GetUserQuery)
 * class GetUserHandler {
 *   async execute(query: GetUserQuery) {
 *     return db.findUser(query.id)
 *   }
 * }
 */
export function QueryHandler(queryClass: ClassConstructor) {
  return (_target: unknown, context: ClassDecoratorContext): void => {
    const meta: QueryHandlerMeta = { queryClass }
    context.metadata[QUERY_HANDLER_META] = meta
  }
}

/**
 * Class decorator that registers the decorated class as an event handler
 * for one or more event classes.
 *
 * @param eventClasses - One or more event classes this handler processes.
 *
 * @example
 * import { EventsHandler } from '@banhmi/cqrs'
 *
 * \@EventsHandler(UserCreatedEvent, UserUpdatedEvent)
 * class UserEventHandler {
 *   async handle(event: UserCreatedEvent | UserUpdatedEvent) {
 *     // ...
 *   }
 * }
 */
export function EventsHandler(...eventClasses: ClassConstructor[]) {
  return (_target: unknown, context: ClassDecoratorContext): void => {
    const meta: EventsHandlerMeta = { eventClasses }
    context.metadata[EVENTS_HANDLER_META] = meta
  }
}

/**
 * Method decorator that marks a method as a saga.
 *
 * A saga is an async generator that subscribes to events and yields
 * commands to be dispatched on the {@link CommandBus}.
 *
 * @example
 * import { Saga } from '@banhmi/cqrs'
 *
 * class UserSagas {
 *   \@Saga()
 *   async *onUserCreated(events: AsyncIterable<UserCreatedEvent>) {
 *     for await (const event of events) {
 *       yield new SendWelcomeEmailCommand(event.userId)
 *     }
 *   }
 * }
 */
export function Saga() {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const name = String(context.name)
    const existing = (context.metadata[SAGA_META] as string[] | undefined) ?? []
    context.metadata[SAGA_META] = [...existing, name]
  }
}
