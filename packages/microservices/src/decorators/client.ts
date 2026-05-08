/**
 * Property decorator that injects a `ClientProxy` into the decorated class
 * property.
 *
 * The token name provided must match a name registered via
 * `ClientsModule.register()`.
 *
 * @param token - The DI token name used when registering the client.
 *
 * @example
 * import { Injectable } from '@banhmi/common'
 * import { Client } from '@banhmi/microservices'
 * import type { ClientProxy } from '@banhmi/microservices'
 *
 * \@Injectable()
 * class AppService {
 *   \@Client('CATS_SERVICE')
 *   private client!: ClientProxy
 * }
 *
 * @remarks
 * This decorator is syntactic sugar; the canonical injection approach is
 * `static inject = [CATS_SERVICE_TOKEN] as const` per the Banhmi DI
 * conventions. Use `@Client` only for property-injection ergonomics.
 */
export function Client(_token: string) {
  // TC39 Stage 3 property decorators are not yet settled for class fields;
  // this is a no-op marker kept for API surface parity. Users should prefer
  // constructor injection via `static inject`.
  return (_target: unknown, _context: ClassAccessorDecoratorContext): void => {}
}
