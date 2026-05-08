import { INJECTABLE_WATERMARK } from '../metadata-keys'

export function Injectable() {
  // biome-ignore lint/suspicious/noExplicitAny: required by TC39 class decorator generic constraint
  return <T extends abstract new (...args: any[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[INJECTABLE_WATERMARK] = true
  }
}
