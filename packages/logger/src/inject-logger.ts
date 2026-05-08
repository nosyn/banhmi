import { Token } from '@banhmi/common'
import type { Logger } from './logger'
import { ROOT_LOGGER } from './tokens'

/** Cache of child logger tokens keyed by name to ensure singleton identity. */
const tokenCache = new Map<string, typeof ROOT_LOGGER>()

/**
 * Returns the DI token for a named child logger.
 *
 * Use in `static inject = [InjectLogger('MyService')] as const` to receive a
 * {@link Logger} pre-configured with `{ name: 'MyService' }` as a child of the
 * root logger registered by {@link LoggerModule.forRoot}.
 *
 * The token is stable per name — calling `InjectLogger('MyService')` multiple
 * times returns the same symbol, so the DI container resolves the singleton.
 *
 * @param name - A label attached as `{ name }` context on the child logger.
 *   Defaults to `'default'` when omitted.
 * @returns A typed DI token resolving to {@link Logger}.
 *
 * @example
 * import { Injectable } from 'banhmi'
 * import { InjectLogger } from '@banhmi/logger'
 * import type { Logger } from '@banhmi/logger'
 *
 * \@Injectable()
 * class CatsService {
 *   static inject = [InjectLogger('CatsService')] as const
 *
 *   constructor(private readonly logger: Logger) {}
 *
 *   findAll() {
 *     this.logger.info('finding all cats')
 *     return []
 *   }
 * }
 */
export function InjectLogger(name = 'default'): typeof ROOT_LOGGER {
  const existing = tokenCache.get(name)
  if (existing !== undefined) return existing
  const token = Token<Logger>(`CHILD_LOGGER:${name}`) as typeof ROOT_LOGGER
  tokenCache.set(name, token)
  return token
}

/**
 * Creates a factory provider that resolves a named child logger token.
 *
 * This is a low-level helper used by {@link LoggerModule} to pre-register
 * child logger tokens. Most consumers only need {@link InjectLogger}.
 *
 * @param name - Child logger name (matches the token produced by {@link InjectLogger}).
 * @returns A factory provider object suitable for a module's `providers` array.
 *
 * @example
 * // In a module:
 * providers: [createChildLoggerProvider('CatsService')]
 */
export function createChildLoggerProvider(name: string) {
  const token = InjectLogger(name)
  return {
    provide: token,
    useFactory: (root: Logger) => root.child({ name }),
    inject: [ROOT_LOGGER],
  }
}
