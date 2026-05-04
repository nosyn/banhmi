import { INJECTABLE_WATERMARK } from '../metadata-keys'

export function Injectable() {
  return <T extends abstract new (...args: any[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[INJECTABLE_WATERMARK] = true
  }
}
