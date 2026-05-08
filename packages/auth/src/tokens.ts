import { Token } from '@banhmi/common'
import type { Strategy } from './strategy'

/**
 * DI token for the array of registered {@link Strategy} instances.
 *
 * Registered by {@link AuthModule.register} and consumed by `@UseAuth`.
 *
 * @example
 * class MyService {
 *   static inject = [AUTH_STRATEGIES] as const
 *   constructor(private strategies: Strategy[]) {}
 * }
 */
export const AUTH_STRATEGIES = Token<Strategy[]>('AUTH_STRATEGIES')

/**
 * State key used to store the authenticated principal on `ctx.state`.
 * @internal
 */
export const AUTH_USER_STATE_KEY = 'banhmi:auth:user'
