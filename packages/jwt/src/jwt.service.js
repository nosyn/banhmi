import { Injectable } from '@banhmi/common'
import { jwtVerify, SignJWT } from 'jose'
import { JWT_OPTIONS_TOKEN } from './tokens'
@Injectable()
export class JwtService {
  options
  static inject = [JWT_OPTIONS_TOKEN]
  secretKey
  constructor(options) {
    this.options = options
    this.secretKey = new TextEncoder().encode(options.secret)
  }
  async sign(payload) {
    const builder = new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
    if (this.options.expiresIn)
      builder.setExpirationTime(this.options.expiresIn)
    if (this.options.issuer) builder.setIssuer(this.options.issuer)
    if (this.options.audience) builder.setAudience(this.options.audience)
    return builder.sign(this.secretKey)
  }
  async verify(token) {
    const { payload } = await jwtVerify(token, this.secretKey, {
      issuer: this.options.issuer,
      audience: this.options.audience,
    })
    return payload
  }
}
