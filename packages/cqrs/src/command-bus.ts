import type { ClassConstructor } from '@banhmi/common'
import type { ICommand, ICommandHandler } from './types'

/**
 * Central bus for dispatching commands to their registered handlers.
 *
 * Handlers are registered via {@link CommandBus.register} (called by the
 * explorer at bootstrap) and dispatched via {@link CommandBus.execute}.
 *
 * @example
 * import { CommandBus } from '@banhmi/cqrs'
 *
 * class MyController {
 *   static inject = [CommandBus] as const
 *   constructor(private bus: CommandBus) {}
 *
 *   \@Post('/users')
 *   async create(ctx: RouteCtx) {
 *     const { name } = await ctx.json<{ name: string }>()
 *     return this.bus.execute(new CreateUserCommand(name))
 *   }
 * }
 */
export class CommandBus {
  private readonly handlers = new Map<ClassConstructor, ICommandHandler>()

  /**
   * Register a handler for a command class.
   *
   * @param commandClass - The command class to bind the handler to.
   * @param handler - The handler instance.
   *
   * @internal
   */
  register(commandClass: ClassConstructor, handler: ICommandHandler): void {
    this.handlers.set(commandClass, handler)
  }

  /**
   * Execute a command by dispatching it to its registered handler.
   *
   * @param command - The command to execute.
   * @returns The handler's result.
   * @throws When no handler is registered for the command class.
   *
   * @example
   * const userId = await commandBus.execute(new CreateUserCommand('Alice'))
   */
  async execute<TResult = void>(command: ICommand): Promise<TResult> {
    const handler = this.handlers.get(command.constructor as ClassConstructor)
    if (!handler) {
      throw new Error(
        `@banhmi/cqrs: no handler registered for command '${command.constructor.name}'. ` +
          'Did you decorate the handler with @CommandHandler()?',
      )
    }
    return handler.execute(command) as Promise<TResult>
  }
}
