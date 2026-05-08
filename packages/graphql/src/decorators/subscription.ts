import { OPERATIONS_METADATA } from '../metadata-keys'
import type { FieldOptions, OperationMeta, SubscriptionOptions } from '../types'

/**
 * Marks a resolver method as a GraphQL subscription.
 *
 * The method should return an `AsyncIterable` from `PubSub.asyncIterator()`.
 *
 * @param typeFn - Thunk returning the event payload type.
 * @param options - Subscription options including filter and resolve functions.
 *
 * @example
 * @Subscription(() => Comment, {
 *   filter: (payload, vars) => payload.postId === vars.postId,
 * })
 * commentAdded(@Args('postId') postId: string) {
 *   return this.pubsub.asyncIterator(`comments.${postId}`)
 * }
 */
export function Subscription(
  typeFn: () => unknown,
  options: FieldOptions & SubscriptionOptions = {},
) {
  return (_target: unknown, context: ClassMemberDecoratorContext): void => {
    const methodKey = String(context.name)
    const op: OperationMeta = {
      kind: 'subscription',
      typeFn,
      options,
      methodKey,
      args: [],
    }
    const existing =
      (context.metadata[OPERATIONS_METADATA] as OperationMeta[] | undefined) ??
      []
    context.metadata[OPERATIONS_METADATA] = [...existing, op]
  }
}
