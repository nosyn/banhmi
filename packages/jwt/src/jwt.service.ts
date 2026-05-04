import { Injectable } from '@banhmi/common'
import type { JWTPayload } from 'jose'
import { jwtVerify, SignJWT } from 'jose'
import { JWT_OPTIONS_TOKEN, type JwtModuleOptions } from './tokens'

@Injectable()
export class JwtService {
  static inject = [JWT_OPTIONS_TOKEN] as const

  private readonly secretKey: Uint8Array

  constructor(private readonly options: JwtModuleOptions) {
    this.secretKey = new TextEncoder().encode(options.secret)
  }

  async sign(payload: Record<string, unknown>): Promise<string> {
    const builder = new SignJWT(payload as JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()

    if (this.options.expiresIn)
      builder.setExpirationTime(this.options.expiresIn)
    if (this.options.issuer) builder.setIssuer(this.options.issuer)
    if (this.options.audience) builder.setAudience(this.options.audience)

    return builder.sign(this.secretKey)
  }

  async verify(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.secretKey, {
      issuer: this.options.issuer,
      audience: this.options.audience,
    })
    return payload
  }
}
