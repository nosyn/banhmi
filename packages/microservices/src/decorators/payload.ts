/**
 * Parameter decorator that documents the payload injection position.
 *
 * @remarks
 * In the Banhmi microservices runtime, the message payload is **always**
 * injected as the first argument and the full {@link MicroserviceMessage}
 * context is always injected as the second argument — regardless of whether
 * `@Payload` or `@Ctx` are present.  These decorators serve as documentation
 * hints and are no-ops at runtime under Bun 1.3.x, which does not yet write
 * TC39 Stage 3 parameter-decorator output to `Symbol.metadata`.
 *
 * @example
 * \@MessagePattern('cats.findOne')
 * findOne(\@Payload() id: string) {
 *   return { id, name: 'Tom' }
 * }
 */
export function Payload() {
  // TC39 Stage 3 parameter decorators do not write to Symbol.metadata in
  // Bun 1.3.x. This decorator is a no-op documentation marker.
  return (
    _target: unknown,
    _context: ClassMethodDecoratorContext,
    _parameterIndex: number,
  ): void => {}
}
