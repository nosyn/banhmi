import type { ModuleMetadata } from '../interfaces/module-metadata'
import { MODULE_METADATA } from '../metadata-keys'

export function Module(metadata: ModuleMetadata) {
  // biome-ignore lint/suspicious/noExplicitAny: required by TC39 class decorator generic constraint
  return <T extends abstract new (...args: any[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[MODULE_METADATA] = metadata
  }
}
