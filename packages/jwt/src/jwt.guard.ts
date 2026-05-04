import { Injectable, UnauthorizedException } from '@banhmi/common'
import type { ExecutionContext, Guard } from '@banhmi/common'
import { JWT_SERVICE_TOKEN } from './tokens'
import type { JwtService } from './jwt.service'

@Injectable()
export class JwtGuard implements Guard {
  static inject = [JWT_SERVICE_TOKEN] as const

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.getCtx().request
    const authHeader = request.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header')
    }

    const token = authHeader.slice(7)
    try {
      const payload = await this.jwtService.verify(token)
      context.getCtx().state['jwtPayload'] = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
