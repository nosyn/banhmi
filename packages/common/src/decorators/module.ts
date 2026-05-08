import type { ModuleMetadata } from '../interfaces/module-metadata'
import { MODULE_METADATA } from '../metadata-keys'

export function Module(metadata: ModuleMetadata) {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[MODULE_METADATA] = metadata
  }
}
