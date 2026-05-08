import { MESSAGE_PATTERN_METADATA } from '../tokens'

/**
 * Method decorator that marks a handler as a **request/reply** message
 * handler for the given pattern.
 *
 * The handler's return value is serialised and sent back to the caller.
 * Use `@EventPattern` instead for fire-and-forget scenarios.
 *
 * The pattern string is stored in `Symbol.metadata` under
 * {@link MESSAGE_PATTERN_METADATA} and read by {@link MicroserviceExplorer}
 * during `onApplicationBootstrap`.
 *
 * @param pattern - The message pattern to respond to.
 *
 * @example
 * import { Injectable } from '@banhmi/common'
 * import { MessagePattern, Payload } from '@banhmi/microservices'
 *
 * \@Injectable()
 * class CatsService {
 *   \@MessagePattern('cats.findOne')
 *   findOne(\@Payload() id: string) {
 *     return { id, name: 'Tom' }
 *   }
 * }
 */
export function MessagePattern(pattern: string) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const methodName = context.name as string
    const existing =
      (context.metadata[MESSAGE_PATTERN_METADATA] as
        | Record<string, string>
        | undefined) ?? {}
    context.metadata[MESSAGE_PATTERN_METADATA] = {
      ...existing,
      [methodName]: pattern,
    }
  }
}
