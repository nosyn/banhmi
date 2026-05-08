/**
 * Marker interface for commands. A command represents an intent to change state.
 *
 * @example
 * class CreateUserCommand implements ICommand {
 *   constructor(readonly name: string, readonly email: string) {}
 * }
 */
// biome-ignore lint/suspicious/noEmptyInterface: intentional marker interface
export interface ICommand {}

/**
 * Marker interface for queries. A query represents a request for data.
 *
 * @example
 * class GetUserQuery implements IQuery {
 *   constructor(readonly id: string) {}
 * }
 */
// biome-ignore lint/suspicious/noEmptyInterface: intentional marker interface
export interface IQuery {}

/**
 * Marker interface for events. An event represents something that has happened.
 *
 * @example
 * class UserCreatedEvent implements IEvent {
 *   constructor(readonly userId: string) {}
 * }
 */
// biome-ignore lint/suspicious/noEmptyInterface: intentional marker interface
export interface IEvent {}

/**
 * Interface for command handlers registered with `@CommandHandler`.
 *
 * @example
 * \@CommandHandler(CreateUserCommand)
 * class CreateUserHandler implements ICommandHandler<CreateUserCommand, string> {
 *   async execute(command: CreateUserCommand): Promise<string> {
 *     return 'user-id'
 *   }
 * }
 */
export interface ICommandHandler<
  TCommand extends ICommand = ICommand,
  TResult = void,
> {
  /**
   * Execute the command and return the result.
   *
   * @param command - The command to execute.
   */
  execute(command: TCommand): Promise<TResult>
}

/**
 * Interface for query handlers registered with `@QueryHandler`.
 *
 * @example
 * \@QueryHandler(GetUserQuery)
 * class GetUserHandler implements IQueryHandler<GetUserQuery, User> {
 *   async execute(query: GetUserQuery): Promise<User> {
 *     return db.findUser(query.id)
 *   }
 * }
 */
export interface IQueryHandler<
  TQuery extends IQuery = IQuery,
  TResult = unknown,
> {
  /**
   * Execute the query and return the result.
   *
   * @param query - The query to execute.
   */
  execute(query: TQuery): Promise<TResult>
}

/**
 * Interface for event handlers registered with `@EventsHandler`.
 *
 * @example
 * \@EventsHandler(UserCreatedEvent)
 * class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
 *   async handle(event: UserCreatedEvent): Promise<void> {
 *     await sendWelcomeEmail(event.userId)
 *   }
 * }
 */
export interface IEventHandler<TEvent extends IEvent = IEvent> {
  /**
   * Handle the event.
   *
   * @param event - The event to handle.
   */
  handle(event: TEvent): Promise<void>
}
