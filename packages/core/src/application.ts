import type {
  AbstractConstructor,
  ClassConstructor,
  ProviderDef,
} from '@banhmi/common'
import type { Container } from './container'
import { LifecycleRunner } from './lifecycle-runner'
import { flattenModuleProviders, type ModuleNode } from './module-graph'

/**
 * Minimal interface for a microservice transport that can be connected to a
 * hybrid application.  Structurally compatible with `Transport` from
 * `@banhmi/microservices` so no hard dependency is required.
 *
 * @example
 * // From @banhmi/microservices:
 * const transport = new InMemoryTransport()
 * app.connectMicroservice({ transport })
 */
export interface MicroserviceOptions {
  /** The transport instance to start when `startAllMicroservices()` is called. */
  transport: {
    listen(handler: (msg: unknown) => Promise<unknown>): Promise<void>
    close(): Promise<void>
  }
}

/**
 * Minimal consumer interface used for structural compatibility when calling
 * `configure(consumer)` on module classes. The concrete implementation lives
 * in `@banhmi/platform-bun` (via `BunMiddlewareConsumer` bridged through
 * `BunAdapter.registerMiddlewareBindings`).
 */
export interface MiddlewareConsumerLike {
  apply(...mws: unknown[]): {
    forRoutes(...routes: unknown[]): MiddlewareConsumerLike
  }
}

export interface HttpAdapter {
  registerController(instance: object, controllerClass: ClassConstructor): void
  registerGateway?(instance: object, gatewayClass: ClassConstructor): void
  listen(port: number): Promise<void>
  close(): Promise<void>
  use(middleware: unknown): void
  getUrl?(): string
  /**
   * Called after all module `configure()` hooks have run. Receives an array
   * of raw bindings collected by the consumer. Optional — only adapters that
   * support middleware binding need to implement this.
   */
  registerMiddlewareBindings?(bindings: unknown[]): void
}

export class BanhmiApplication {
  private lifecycleRunner: LifecycleRunner
  private allProviders: ProviderDef[]
  private shutdownHooksEnabled = false
  private microservices: MicroserviceOptions[] = []

  constructor(
    readonly container: Container,
    readonly moduleTree: ModuleNode,
    readonly adapter: HttpAdapter,
  ) {
    this.lifecycleRunner = new LifecycleRunner(container)
    this.allProviders = flattenModuleProviders(moduleTree)
  }

  /**
   * Register a microservice transport to run alongside the HTTP server in the
   * same process (hybrid app).  The transport is not started until
   * {@link startAllMicroservices} is called.
   *
   * @param opts - Options containing the transport instance.
   * @returns `this` for chaining.
   *
   * @example
   * import { InMemoryTransport } from '@banhmi/microservices'
   * const transport = new InMemoryTransport()
   * app.connectMicroservice({ transport })
   * await app.startAllMicroservices()
   * await app.listen(3000)
   */
  connectMicroservice(opts: MicroserviceOptions): this {
    this.microservices.push(opts)
    return this
  }

  /**
   * Start all microservice transports that were registered with
   * {@link connectMicroservice}.  Safe to call multiple times (already-started
   * transports are tracked; this call starts only the ones not yet running).
   *
   * @example
   * await app.startAllMicroservices()
   */
  async startAllMicroservices(): Promise<void> {
    await Promise.all(
      this.microservices.map((ms) =>
        ms.transport.listen(() => Promise.resolve(undefined)),
      ),
    )
  }

  use(middleware: unknown): this {
    this.adapter.use(middleware)
    return this
  }

  enableShutdownHooks(): this {
    this.shutdownHooksEnabled = true
    return this
  }

  getUrl(): string {
    const url = this.adapter.getUrl?.()
    if (!url) throw new Error('Server is not listening yet')
    return url
  }

  /**
   * Bootstrap the application (run lifecycle hooks, register controllers) but
   * do **not** call `adapter.listen()`.  Intended for edge and serverless
   * runtimes where the transport is managed externally.
   *
   * After calling `init()` you can dispatch individual requests via
   * `dispatchRequest(request)` on the underlying adapter.
   *
   * @example
   * await app.init()
   * const response = await (app.adapter as BunAdapter).dispatchRequest(req)
   */
  async init(): Promise<void> {
    await this.lifecycleRunner.runModuleInit(this.allProviders)

    if (this.adapter.registerMiddlewareBindings) {
      const allBindings = await this.collectMiddlewareBindings(this.moduleTree)
      this.adapter.registerMiddlewareBindings(allBindings)
    }

    for (const ctrl of this.flattenControllers(this.moduleTree)) {
      const instance = this.container.resolve(ctrl)
      this.adapter.registerController(instance as object, ctrl)
    }

    for (const gw of this.flattenGateways(this.moduleTree)) {
      const instance = this.container.resolve(gw)
      this.adapter.registerGateway?.(instance as object, gw)
    }

    await this.lifecycleRunner.runApplicationBootstrap(this.allProviders)
  }

  async listen(port: number): Promise<void> {
    await this.init()
    await this.adapter.listen(port)

    if (this.shutdownHooksEnabled) {
      for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        process.once(signal, async () => {
          await this.close(signal)
          process.exit(0)
        })
      }
    }
  }

  async close(signal?: string): Promise<void> {
    await this.lifecycleRunner.runModuleDestroy(this.allProviders)
    await this.adapter.close()
    await this.lifecycleRunner.runApplicationShutdown(this.allProviders, signal)
  }

  /**
   * Walks the module tree and collects all middleware bindings from modules
   * that implement `configure(consumer)`. Returns a flat list of raw binding
   * objects (typed as `unknown[]` so `@banhmi/core` stays free of middleware
   * type imports; the adapter casts them at registration time).
   */
  private async collectMiddlewareBindings(
    node: ModuleNode,
  ): Promise<unknown[]> {
    const seen = new Set<AbstractConstructor>()
    const allBindings: unknown[] = []

    const walk = async (n: ModuleNode): Promise<void> => {
      if (seen.has(n.module)) return
      seen.add(n.module)

      for (const imp of n.imports) {
        await walk(imp)
      }

      // Check if the module class has a `configure` instance method
      const proto = n.module.prototype as Record<string, unknown>
      if (typeof proto.configure === 'function') {
        // Create a lightweight consumer shim that collects bindings
        const bindings: unknown[] = []
        const consumer: MiddlewareConsumerLike = {
          apply(...mws: unknown[]) {
            return {
              forRoutes(...routes: unknown[]) {
                bindings.push({ mws, routes })
                return consumer
              },
            }
          },
        }

        // Instantiate the module and call configure
        const moduleInstance = new (n.module as ClassConstructor)() as Record<
          string,
          unknown
        >
        await (
          moduleInstance.configure as (
            c: MiddlewareConsumerLike,
          ) => void | Promise<void>
        )(consumer)

        allBindings.push(...bindings)
      }
    }

    await walk(node)
    return allBindings
  }

  private flattenControllers(node: ModuleNode): ClassConstructor[] {
    const seen = new Set<AbstractConstructor>()
    const result: ClassConstructor[] = []

    function walk(n: ModuleNode) {
      if (seen.has(n.module)) return
      seen.add(n.module)
      for (const imp of n.imports) walk(imp)
      result.push(...((n.controllers ?? []) as ClassConstructor[]))
    }

    walk(node)
    return result
  }

  private flattenGateways(node: ModuleNode): ClassConstructor[] {
    const seen = new Set<AbstractConstructor>()
    const result: ClassConstructor[] = []

    function walk(n: ModuleNode) {
      if (seen.has(n.module)) return
      seen.add(n.module)
      for (const imp of n.imports) walk(imp)
      result.push(...((n.gateways ?? []) as ClassConstructor[]))
    }

    walk(node)
    return result
  }
}
