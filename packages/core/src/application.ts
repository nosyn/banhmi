import type {
  AbstractConstructor,
  ClassConstructor,
  ProviderDef,
} from '@banhmi/common'
import type { Container } from './container'
import { LifecycleRunner } from './lifecycle-runner'
import { type ModuleNode, flattenModuleProviders } from './module-graph'

export interface HttpAdapter {
  registerController(instance: object, controllerClass: ClassConstructor): void
  registerGateway?(instance: object, gatewayClass: ClassConstructor): void
  listen(port: number): Promise<void>
  close(): Promise<void>
  use(middleware: unknown): void
}

export class BanhmiApplication {
  private lifecycleRunner: LifecycleRunner
  private allProviders: ProviderDef[]
  private shutdownHooksEnabled = false

  constructor(
    readonly container: Container,
    readonly moduleTree: ModuleNode,
    readonly adapter: HttpAdapter,
  ) {
    this.lifecycleRunner = new LifecycleRunner(container)
    this.allProviders = flattenModuleProviders(moduleTree)
  }

  use(middleware: unknown): this {
    this.adapter.use(middleware)
    return this
  }

  enableShutdownHooks(): this {
    this.shutdownHooksEnabled = true
    return this
  }

  async listen(port: number): Promise<void> {
    await this.lifecycleRunner.runModuleInit(this.allProviders)

    for (const ctrl of this.flattenControllers(this.moduleTree)) {
      const instance = this.container.resolve(ctrl)
      this.adapter.registerController(instance as object, ctrl)
    }

    for (const gw of this.flattenGateways(this.moduleTree)) {
      const instance = this.container.resolve(gw)
      this.adapter.registerGateway?.(instance as object, gw)
    }

    await this.adapter.listen(port)
    await this.lifecycleRunner.runApplicationBootstrap(this.allProviders)

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
