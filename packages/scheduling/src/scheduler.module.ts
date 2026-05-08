import type {
  ClassConstructor,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@banhmi/common'
import { Module } from '@banhmi/common'
import type { Container, ModuleNode } from '@banhmi/core'
import { CONTAINER_TOKEN, MODULE_TREE_TOKEN } from '@banhmi/platform-bun'
import { ScheduleExplorer } from './explorer'
import { Scheduler } from './scheduler'
import { SCHEDULER_TOKEN } from './tokens'

/**
 * Internal bootstrap service that discovers `@Cron`, `@Interval`, and
 * `@Timeout` decorators and registers them on the shared {@link Scheduler}.
 * Also cancels all jobs on application shutdown.
 *
 * @internal
 */
class ScheduleBootstrapService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  static inject = [SCHEDULER_TOKEN, CONTAINER_TOKEN, MODULE_TREE_TOKEN] as const

  constructor(
    private readonly scheduler: Scheduler,
    private readonly container: Container,
    private readonly moduleTree: ModuleNode,
  ) {}

  onApplicationBootstrap(): void {
    const explorer = new ScheduleExplorer()
    const pairs = this.collectProviderPairs(this.moduleTree, new Set())
    explorer.explore(this.scheduler, pairs)
  }

  onApplicationShutdown(): void {
    this.scheduler.cancelAll()
  }

  private collectProviderPairs(
    node: ModuleNode,
    seen: Set<ModuleNode>,
  ): Array<[object, ClassConstructor]> {
    if (seen.has(node)) return []
    seen.add(node)

    const pairs: Array<[object, ClassConstructor]> = []

    for (const imp of node.imports) {
      pairs.push(...this.collectProviderPairs(imp, seen))
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

/**
 * Module that registers the {@link Scheduler} DI token and boots the
 * schedule explorer at application startup. All registered jobs are
 * cancelled automatically on shutdown.
 *
 * @example
 * import { Module } from 'banhmi'
 * import { ScheduleModule } from '@banhmi/scheduling'
 *
 * \@Module({ imports: [ScheduleModule.forRoot()] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class ScheduleModule {
  /**
   * Create a configured scheduling module. The returned module registers
   * {@link SCHEDULER_TOKEN} and wires up all `@Cron`, `@Interval`, and
   * `@Timeout` decorators at bootstrap.
   *
   * @returns A dynamically-created `@Module`.
   *
   * @example
   * ScheduleModule.forRoot()
   */
  static forRoot() {
    const scheduler = new Scheduler()

    @Module({
      providers: [
        { provide: SCHEDULER_TOKEN, useValue: scheduler },
        ScheduleBootstrapService,
      ],
      exports: [SCHEDULER_TOKEN],
    })
    class ScheduleRootModule {}

    return ScheduleRootModule
  }
}
