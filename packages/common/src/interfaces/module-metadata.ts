import type { Token } from '../token'

// biome-ignore lint/suspicious/noExplicitAny: constructor args are resolved by the DI container, not typed at call sites
export type ClassConstructor<T = unknown> = new (...args: any[]) => T
export type AbstractConstructor<T = unknown> = abstract new (
  // biome-ignore lint/suspicious/noExplicitAny: constructor args are resolved by the DI container, not typed at call sites
  ...args: any[]
) => T
export type InjectToken<T = unknown> = Token<T> | ClassConstructor<T>

export type ValueProvider<T> = {
  provide: Token<T>
  useValue: T
}

export type FactoryProvider<T> = {
  provide: Token<T>
  useFactory: (...args: unknown[]) => T | Promise<T>
  inject?: InjectToken[]
}

export type ProviderDef<T = unknown> =
  | ClassConstructor<T>
  | ValueProvider<T>
  | FactoryProvider<T>

export interface ModuleMetadata {
  imports?: AbstractConstructor[]
  controllers?: ClassConstructor[]
  gateways?: ClassConstructor[]
  providers?: ProviderDef[]
  exports?: InjectToken[]
}
