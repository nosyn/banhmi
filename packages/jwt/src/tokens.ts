import { Token } from '@banhmi/common'
import type { JwtService } from './jwt.service'

export const JWT_SERVICE_TOKEN = Token<JwtService>('JwtService')

export interface JwtModuleOptions {
  secret: string
  /**
   * JWT signing algorithm. Defaults to `'HS256'`.
   * The same value is enforced during verification to prevent algorithm
   * confusion attacks.
   *
   * @example 'HS256' | 'HS512' | 'RS256' | 'ES256'
   */
  algorithm?: string
  expiresIn?: string
  issuer?: string
  audience?: string
}

export const JWT_OPTIONS_TOKEN = Token<JwtModuleOptions>('JwtModuleOptions')
