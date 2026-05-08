import type { ClassConstructor, OnApplicationBootstrap } from '@banhmi/common'
import type { Container, ModuleNode } from '@banhmi/core'
import { CONTAINER_TOKEN, MODULE_TREE_TOKEN } from '@banhmi/platform-bun'
import type { CommandBus } from './command-bus'
import {
  COMMAND_HANDLER_META,
  type CommandHandlerMeta,
  EVENTS_HANDLER_META,
  type EventsHandlerMeta,
  QUERY_HANDLER_META,
  type QueryHandlerMeta,
  SAGA_META,
} from './decorators'
import type { EventBus } from './event-bus'
import type { QueryBus } from './query-bus'
import { runSaga } from './saga'
import { COMMAND_BUS_TOKEN, EVENT_BUS_TOKEN, QUERY_BUS_TOKEN } from './tokens'
import type {
  ICommand,
  ICommandHandler,
  IEventHandler,
  IQueryHandler,
} from './types'

/**
 * Bootstrap service that walks the module tree at startup and registers
 * all `@CommandHandler`, `@QueryHandler`, `@EventsHandler`, and `@Saga`
 * decorated classes on their respective buses.
 *
 * @internal
 */
export class CqrsExplorer implements OnApplicationBootstrap {
  static inject = [
    COMMAND_BUS_TOKEN,
    QUERY_BUS_TOKEN,
    EVENT_BUS_TOKEN,
    CONTAINER_TOKEN,
    MODULE_TREE_TOKEN,
  ] as const

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    private readonly container: Container,
    private readonly moduleTree: ModuleNode,
  ) {}

  onApplicationBootstrap(): void {
    const pairs = this.collectPairs(this.moduleTree, new Set())

    for (const [instance, cls] of pairs) {
      const meta = cls[Symbol.metadata] as Record<symbol, unknown> | null
      if (!meta) continue

      // @CommandHandler
      const cmdMeta = meta[COMMAND_HANDLER_META] as
        | CommandHandlerMeta
        | undefined
      if (cmdMeta) {
        this.commandBus.register(
          cmdMeta.commandClass,
          instance as ICommandHandler,
        )
      }

      // @QueryHandler
      const qryMeta = meta[QUERY_HANDLER_META] as QueryHandlerMeta | undefined
      if (qryMeta) {
        this.queryBus.register(qryMeta.queryClass, instance as IQueryHandler)
      }

      // @EventsHandler
      const evtMeta = meta[EVENTS_HANDLER_META] as EventsHandlerMeta | undefined
      if (evtMeta) {
        for (const eventClass of evtMeta.eventClasses) {
          this.eventBus.register(eventClass, instance as IEventHandler)
        }
      }

      // @Saga — each method with @Saga is an async generator
      const sagaMethodNames = meta[SAGA_META] as string[] | undefined
      if (sagaMethodNames) {
        const instanceRec = instance as Record<string, unknown>
        for (const methodName of sagaMethodNames) {
          const fn = instanceRec[methodName]
          if (typeof fn !== 'function') continue
          // We need to know which event class this saga subscribes to.
          // The saga method receives an AsyncIterable<TEvent>; we look for
          // SAGA_EVENT_META set by the @Saga decorator on the method itself.
          // For simplicity, sagas subscribe to all events — the saga method
          // is responsible for filtering. We use a single universal subscription.
          // Actually, sagas receive an iterable per event type. For Wave 6 we
          // keep it simple: the saga class itself may be decorated with
          // @EventsHandler to declare which events it handles.
          if (evtMeta) {
            for (const eventClass of evtMeta.eventClasses) {
              runSaga(
                fn.bind(instance) as (
                  events: AsyncIterable<unknown>,
                ) => AsyncGenerator<ICommand>,
                eventClass,
                this.commandBus,
                this.eventBus,
              )
            }
          }
        }
      }
    }
  }

  private collectPairs(
    node: ModuleNode,
    seen: Set<ModuleNode>,
  ): Array<[object, ClassConstructor]> {
    if (seen.has(node)) return []
    seen.add(node)

    const pairs: Array<[object, ClassConstructor]> = []

    for (const imp of node.imports) {
      pairs.push(...this.collectPairs(imp, seen))
    }

    const allClasses = [...(node.providers ?? []), ...(node.controllers ?? [])]

    for (const p of allClasses) {
      if (typeof p !== 'function') continue
      const cls = p as ClassConstructor
      try {
        const instance = this.container.resolve(cls) as object
        pairs.push([instance, cls])
      } catch {
        // skip unresolvable providers
      }
    }

    return pairs
  }
}
