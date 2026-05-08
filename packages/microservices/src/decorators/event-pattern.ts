import { EVENT_PATTERN_METADATA } from '../tokens'

/**
 * Method decorator that marks a handler as a **fire-and-forget** event
 * handler for the given pattern.
 *
 * The handler's return value is discarded; no response is sent back to the
 * emitter.  Use `@MessagePattern` instead for request/reply scenarios.
 *
 * The pattern string is stored in `Symbol.metadata` under
 * {@link EVENT_PATTERN_METADATA} and read by {@link MicroserviceExplorer}
 * during `onApplicationBootstrap`.
 *
 * @param pattern - The event pattern to subscribe to.
 *
 * @example
 * import { Injectable } from '@banhmi/common'
 * import { EventPattern, Payload } from '@banhmi/microservices'
 *
 * \@Injectable()
 * class UserService {
 *   \@EventPattern('user.created')
 *   async onUserCreated(\@Payload() data: UserCreatedPayload) {
 *     console.log('new user', data)
 *   }
 * }
 */
export function EventPattern(pattern: string) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const methodName = context.name as string
    const existing =
      (context.metadata[EVENT_PATTERN_METADATA] as
        | Record<string, string>
        | undefined) ?? {}
    context.metadata[EVENT_PATTERN_METADATA] = {
      ...existing,
      [methodName]: pattern,
    }
  }
}
