import { CONTROLLER_METADATA } from '../metadata-keys'

export interface ControllerMetadata {
  prefix: string
}

export function Controller(prefix = '') {
  // biome-ignore lint/suspicious/noExplicitAny: required by TC39 class decorator generic constraint
  return <T extends abstract new (...args: any[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[CONTROLLER_METADATA] = {
      prefix,
    } satisfies ControllerMetadata
  }
}
