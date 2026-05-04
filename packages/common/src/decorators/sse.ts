import { Header } from './http'
import { Get } from './route'

export function Sse(path?: string) {
  return (target: unknown, context: ClassMethodDecoratorContext): void => {
    Get(path)(target, context)
    Header('Content-Type', 'text/event-stream')(target, context)
    Header('Cache-Control', 'no-cache')(target, context)
    Header('Connection', 'keep-alive')(target, context)
  }
}
