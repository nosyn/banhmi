import { Token } from '@banhmi/common'
import type { BetterAuthOptions, BetterAuthSessionData } from './types'

/** Token for the BetterAuthOptions configuration. */
export const BETTER_AUTH_OPTIONS = Token<BetterAuthOptions>('BetterAuthOptions')

/**
 * Token for the thin better-auth session client.
 * The client can call `getSession(req)` to retrieve the session for a request.
 */
export const BETTER_AUTH_CLIENT = Token<{
  getSession(req: Request): Promise<BetterAuthSessionData | null>
}>('BetterAuthClient')
