import type { Token } from '../token'

export type ClassConstructor<T = unknown> = new (...args: unknown[]) => T
export type AbstractConstructor<T = unknown> = abstract new (
  ...args: unknown[]
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
  providers?: ProviderDef[]
  exports?: InjectToken[]
}
