import { INJECTABLE_WATERMARK } from '../metadata-keys'

export function Injectable() {
  return function <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void {
    context.metadata[INJECTABLE_WATERMARK] = true
  }
}
