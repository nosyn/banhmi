import type { ClassConstructor, InjectToken, ProviderDef } from '@bunnest/common'
import {
  getInjectTokens,
  getProviderToken,
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
} from './provider'

export class Container {
  private providers = new Map<symbol | ClassConstructor, ProviderDef>()
  private singletons = new Map<symbol | ClassConstructor, unknown>()

  register(def: ProviderDef): void {
    const token = getProviderToken(def)
    this.providers.set(token as symbol | ClassConstructor, def)
  }

  resolve<T>(token: InjectToken<T>): T {
    const key = token as symbol | ClassConstructor

    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T
    }

    const def = this.providers.get(key)
    if (!def) {
      const name = typeof key === 'symbol' ? String(key) : (key as ClassConstructor).name
      throw new Error(`No provider registered for token: ${name}`)
    }

    const instance = this.instantiate(def) as T
    this.singletons.set(key, instance)
    return instance
  }

  private instantiate(def: ProviderDef): unknown {
    if (isValueProvider(def)) return def.useValue

    if (isFactoryProvider(def)) {
      const args = (def.inject ?? []).map((t) => this.resolve(t))
      return def.useFactory(...args)
    }

    if (isClassProvider(def)) {
      const inject = getInjectTokens(def)
      const args = inject.map((t) => this.resolve(t))
      return new def(...args)
    }

    throw new Error('Unknown provider definition')
  }
}
