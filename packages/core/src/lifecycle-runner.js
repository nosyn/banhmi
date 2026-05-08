import { isClassProvider } from './provider'
export class LifecycleRunner {
  container
  constructor(container) {
    this.container = container
  }
  async runModuleInit(providers) {
    for (const def of providers) {
      await this.invokeHook(def, 'onModuleInit')
    }
  }
  async runApplicationBootstrap(providers) {
    for (const def of providers) {
      await this.invokeHook(def, 'onApplicationBootstrap')
    }
  }
  async runModuleDestroy(providers) {
    for (const def of [...providers].reverse()) {
      await this.invokeHook(def, 'onModuleDestroy')
    }
  }
  async runApplicationShutdown(providers, signal) {
    for (const def of [...providers].reverse()) {
      await this.invokeHook(
        def,
        'onApplicationShutdown',
        signal !== undefined ? [signal] : [],
      )
    }
  }
  async invokeHook(def, method, args = []) {
    if (!isClassProvider(def)) return
    const instance = this.container.resolve(def)
    if (typeof instance[method] === 'function') {
      await instance[method](...args)
    }
  }
}
