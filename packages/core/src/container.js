import {
  getInjectTokens,
  getProviderToken,
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
} from './provider'
export class Container {
  providers = new Map()
  singletons = new Map()
  resolving = new Set()
  register(def) {
    const token = getProviderToken(def)
    this.providers.set(token, def)
  }
  resolve(token) {
    const key = token
    if (this.singletons.has(key)) {
      return this.singletons.get(key)
    }
    if (this.resolving.has(key)) {
      const name = typeof key === 'symbol' ? String(key) : key.name
      throw new Error(
        `Circular injection dependency detected for token: ${name}`,
      )
    }
    const def = this.providers.get(key)
    if (!def) {
      const name = typeof key === 'symbol' ? String(key) : key.name
      throw new Error(`No provider registered for token: ${name}`)
    }
    this.resolving.add(key)
    try {
      const instance = this.instantiate(def)
      this.singletons.set(key, instance)
      return instance
    } finally {
      this.resolving.delete(key)
    }
  }
  instantiate(def) {
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
