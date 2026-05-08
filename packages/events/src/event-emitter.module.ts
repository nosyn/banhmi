import type { ClassConstructor, OnApplicationBootstrap } from '@banhmi/common'
import { Module } from '@banhmi/common'
import type { Container, ModuleNode } from '@banhmi/core'
import { CONTAINER_TOKEN, MODULE_TREE_TOKEN } from '@banhmi/platform-bun'
import { EventEmitter } from './event-emitter'
import { EventsExplorer } from './explorer'
import { EVENT_EMITTER_TOKEN } from './tokens'

/**
 * Internal service that walks providers at bootstrap and registers
 * `@OnEvent` listeners on the shared {@link EventEmitter}.
 *
 * @internal
 */
class EventsBootstrapService implements OnApplicationBootstrap {
  static inject = [
    EVENT_EMITTER_TOKEN,
    CONTAINER_TOKEN,
    MODULE_TREE_TOKEN,
  ] as const

  constructor(
    private readonly emitter: EventEmitter,
    private readonly container: Container,
    private readonly moduleTree: ModuleNode,
  ) {}

  onApplicationBootstrap(): void {
    const explorer = new EventsExplorer()
    const pairs = this.collectProviderPairs(this.moduleTree, new Set())
    explorer.explore(this.emitter, pairs)
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
        // provider might not be resolvable (e.g. external token providers)
      }
    }

    return pairs
  }
}

/**
 * Module that registers the global {@link EventEmitter} DI token and
 * boots the `@OnEvent` explorer at application startup.
 *
 * Import `EventEmitterModule.forRoot()` in your root module to enable
 * event-driven patterns via `@OnEvent` method decorators.
 *
 * @example
 * import { Module } from 'banhmi'
 * import { EventEmitterModule } from '@banhmi/events'
 *
 * \@Module({ imports: [EventEmitterModule.forRoot()] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class EventEmitterModule {
  /**
   * Create a configured events module. The returned module registers the
   * {@link EVENT_EMITTER_TOKEN} and walks all providers at bootstrap to wire
   * up `@OnEvent` listeners automatically.
   *
   * @returns A dynamically-created `@Module`.
   *
   * @example
   * EventEmitterModule.forRoot()
   */
  static forRoot() {
    const emitter = new EventEmitter()

    @Module({
      providers: [
        { provide: EVENT_EMITTER_TOKEN, useValue: emitter },
        EventsBootstrapService,
      ],
      exports: [EVENT_EMITTER_TOKEN],
    })
    class EventEmitterRootModule {}

    return EventEmitterRootModule
  }
}
