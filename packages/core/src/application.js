import { LifecycleRunner } from './lifecycle-runner'
import { flattenModuleProviders } from './module-graph'
export class BanhmiApplication {
  container
  moduleTree
  adapter
  lifecycleRunner
  allProviders
  shutdownHooksEnabled = false
  constructor(container, moduleTree, adapter) {
    this.container = container
    this.moduleTree = moduleTree
    this.adapter = adapter
    this.lifecycleRunner = new LifecycleRunner(container)
    this.allProviders = flattenModuleProviders(moduleTree)
  }
  use(middleware) {
    this.adapter.use(middleware)
    return this
  }
  enableShutdownHooks() {
    this.shutdownHooksEnabled = true
    return this
  }
  async listen(port) {
    await this.lifecycleRunner.runModuleInit(this.allProviders)
    for (const ctrl of this.flattenControllers(this.moduleTree)) {
      const instance = this.container.resolve(ctrl)
      this.adapter.registerController(instance, ctrl)
    }
    for (const gw of this.flattenGateways(this.moduleTree)) {
      const instance = this.container.resolve(gw)
      this.adapter.registerGateway?.(instance, gw)
    }
    await this.adapter.listen(port)
    await this.lifecycleRunner.runApplicationBootstrap(this.allProviders)
    if (this.shutdownHooksEnabled) {
      for (const signal of ['SIGTERM', 'SIGINT']) {
        process.once(signal, async () => {
          await this.close(signal)
          process.exit(0)
        })
      }
    }
  }
  async close(signal) {
    await this.lifecycleRunner.runModuleDestroy(this.allProviders)
    await this.adapter.close()
    await this.lifecycleRunner.runApplicationShutdown(this.allProviders, signal)
  }
  flattenControllers(node) {
    const seen = new Set()
    const result = []
    function walk(n) {
      if (seen.has(n.module)) return
      seen.add(n.module)
      for (const imp of n.imports) walk(imp)
      result.push(...(n.controllers ?? []))
    }
    walk(node)
    return result
  }
  flattenGateways(node) {
    const seen = new Set()
    const result = []
    function walk(n) {
      if (seen.has(n.module)) return
      seen.add(n.module)
      for (const imp of n.imports) walk(imp)
      result.push(...(n.gateways ?? []))
    }
    walk(node)
    return result
  }
}
