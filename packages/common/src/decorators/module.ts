import { MODULE_METADATA } from '../metadata-keys'
import type { ModuleMetadata } from '../interfaces/module-metadata'

export function Module(metadata: ModuleMetadata) {
  return function <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void {
    context.metadata[MODULE_METADATA] = metadata
  }
}
