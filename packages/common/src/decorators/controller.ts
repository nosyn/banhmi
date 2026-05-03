import { CONTROLLER_METADATA } from '../metadata-keys'

export interface ControllerMetadata {
  prefix: string
}

export function Controller(prefix = '') {
  return function <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void {
    context.metadata[CONTROLLER_METADATA] = { prefix } satisfies ControllerMetadata
  }
}
