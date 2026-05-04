import type { ClassConstructor, ProviderDef } from '@banhmi/common'
import type { Container } from './container'
import { isClassProvider } from './provider'

export class LifecycleRunner {
  constructor(private readonly container: Container) {}

  async runModuleInit(providers: ProviderDef[]): Promise<void> {
    for (const def of providers) {
      await this.invokeHook(def, 'onModuleInit')
    }
  }

  async runApplicationBootstrap(providers: ProviderDef[]): Promise<void> {
    for (const def of providers) {
      await this.invokeHook(def, 'onApplicationBootstrap')
    }
  }

  async runModuleDestroy(providers: ProviderDef[]): Promise<void> {
    for (const def of [...providers].reverse()) {
      await this.invokeHook(def, 'onModuleDestroy')
    }
  }

  async runApplicationShutdown(
    providers: ProviderDef[],
    signal?: string,
  ): Promise<void> {
    for (const def of [...providers].reverse()) {
      await this.invokeHook(
        def,
        'onApplicationShutdown',
        signal !== undefined ? [signal] : [],
      )
    }
  }

  private async invokeHook(
    def: ProviderDef,
    method: string,
    args: unknown[] = [],
  ): Promise<void> {
    if (!isClassProvider(def)) return
    const instance = this.container.resolve(def as ClassConstructor) as Record<
      string,
      unknown
    >
    if (typeof instance[method] === 'function') {
      await (instance[method] as (...a: unknown[]) => void | Promise<void>)(
        ...args,
      )
    }
  }
}
