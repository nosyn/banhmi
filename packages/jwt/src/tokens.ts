import { Token } from '@banhmi/common'
import type { JwtService } from './jwt.service'

export const JWT_SERVICE_TOKEN = Token<JwtService>('JwtService')

export interface JwtModuleOptions {
  secret: string
  expiresIn?: string
  issuer?: string
  audience?: string
}

export const JWT_OPTIONS_TOKEN = Token<JwtModuleOptions>('JwtModuleOptions')
