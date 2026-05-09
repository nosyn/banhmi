import type {
  ClassConstructor,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@banhmi/common'
import type { Container, ModuleNode } from '@banhmi/core'
import { CONTAINER_TOKEN, MODULE_TREE_TOKEN } from '@banhmi/platform-bun'
import type { RedisLike } from '@banhmi/redis'
import { PROCESSOR_METADATA } from './metadata'
import { QUEUE_OPTIONS } from './tokens'
import type { QueueOptions } from './types'
import { Worker } from './worker'

/**
 * Walks the provider/controller tree, discovers `@Processor` classes, and
 * starts a {@link Worker} for each. All workers are stopped on shutdown.
 *
 * @internal
 */
export class QueueExplorerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  static inject = [QUEUE_OPTIONS, CONTAINER_TOKEN, MODULE_TREE_TOKEN] as const

  private workers: Worker[] = []

  constructor(
    private readonly queueOptions: QueueOptions[],
    private readonly container: Container,
    private readonly moduleTree: ModuleNode,
  ) {}

  /**
   * Discover all `@Processor` classes and start their workers.
   */
  onApplicationBootstrap(): void {
    const pairs = this.collectProviderPairs(this.moduleTree, new Set())

    for (const [instance, cls] of pairs) {
      const meta = (cls as { [Symbol.metadata]?: Record<symbol, unknown> })[
        Symbol.metadata
      ]
      if (!meta) continue

      const queueName = meta[PROCESSOR_METADATA] as string | undefined
      if (!queueName) continue

      // find matching queue options to get the redis client
      const opts = this.queueOptions.find((o) => o.name === queueName)
      if (!opts) continue

      const redisToken = Symbol.for(`banhmi:queue-redis:${queueName}`)
      let redis: RedisLike | undefined
      try {
        redis = this.container.resolve(redisToken) as RedisLike
      } catch {
        // no dedicated redis for this queue, skip
        continue
      }

      const worker = new Worker(queueName, redis, instance, cls)
      worker.start()
      this.workers.push(worker)
    }
  }

  /**
   * Stop all running workers gracefully.
   */
  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.stop()))
    this.workers = []
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
        // skip unresolvable
      }
    }

    return pairs
  }
}

/**
 * Provides all registered queue options as a flat array for the explorer.
 *
 * @internal
 */
export class QueueOptionsCollector {
  readonly options: QueueOptions[]

  constructor(...opts: QueueOptions[]) {
    this.options = opts
  }
}
