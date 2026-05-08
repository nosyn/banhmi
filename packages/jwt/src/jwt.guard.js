import { Injectable, UnauthorizedException } from '@banhmi/common'
import { JWT_SERVICE_TOKEN } from './tokens'
@Injectable()
export class JwtGuard {
  jwtService
  static inject = [JWT_SERVICE_TOKEN]
  constructor(jwtService) {
    this.jwtService = jwtService
  }
  async canActivate(context) {
    const request = context.getCtx().request
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header')
    }
    const token = authHeader.slice(7)
    try {
      const payload = await this.jwtService.verify(token)
      context.getCtx().state.jwtPayload = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
