import type { ClassConstructor } from '@banhmi/common'
import type { IQuery, IQueryHandler } from './types'

/**
 * Central bus for dispatching queries to their registered handlers.
 *
 * @example
 * import { QueryBus } from '@banhmi/cqrs'
 *
 * class MyController {
 *   static inject = [QueryBus] as const
 *   constructor(private bus: QueryBus) {}
 *
 *   \@Get('/users/:id')
 *   async getUser(ctx: RouteCtx) {
 *     return this.bus.execute(new GetUserQuery(ctx.params.id))
 *   }
 * }
 */
export class QueryBus {
  private readonly handlers = new Map<ClassConstructor, IQueryHandler>()

  /**
   * Register a handler for a query class.
   *
   * @param queryClass - The query class to bind the handler to.
   * @param handler - The handler instance.
   *
   * @internal
   */
  register(queryClass: ClassConstructor, handler: IQueryHandler): void {
    this.handlers.set(queryClass, handler)
  }

  /**
   * Execute a query by dispatching it to its registered handler.
   *
   * @param query - The query to execute.
   * @returns The handler's result.
   * @throws When no handler is registered for the query class.
   *
   * @example
   * const user = await queryBus.execute(new GetUserQuery('user-id'))
   */
  async execute<TResult = unknown>(query: IQuery): Promise<TResult> {
    const handler = this.handlers.get(query.constructor as ClassConstructor)
    if (!handler) {
      throw new Error(
        `@banhmi/cqrs: no handler registered for query '${query.constructor.name}'. ` +
          'Did you decorate the handler with @QueryHandler()?',
      )
    }
    return handler.execute(query) as Promise<TResult>
  }
}
