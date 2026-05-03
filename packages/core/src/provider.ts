import type { ClassConstructor, FactoryProvider, InjectToken, ProviderDef, ValueProvider } from '@bunnest/common'

export function isValueProvider<T>(def: ProviderDef<T>): def is ValueProvider<T> {
  return typeof def === 'object' && 'useValue' in def
}

export function isFactoryProvider<T>(def: ProviderDef<T>): def is FactoryProvider<T> {
  return typeof def === 'object' && 'useFactory' in def
}

export function isClassProvider<T>(def: ProviderDef<T>): def is ClassConstructor<T> {
  return typeof def === 'function'
}

export function getProviderToken(def: ProviderDef): symbol | ClassConstructor {
  if (isClassProvider(def)) return def
  return def.provide as symbol
}

export function getInjectTokens(def: ProviderDef): InjectToken[] {
  if (isClassProvider(def)) {
    return (def as { inject?: InjectToken[] }).inject ?? []
  }
  if (isFactoryProvider(def)) {
    return def.inject ?? []
  }
  return []
}
