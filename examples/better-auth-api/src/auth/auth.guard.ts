import type { ExecutionContext, Guard } from 'banhmi'
import { Injectable, UnauthorizedException } from 'banhmi'
import { AuthService } from './auth.service'

@Injectable()
export class AuthGuard implements Guard {
  static inject = [AuthService] as const

  constructor(private auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.getCtx().request
    const session = await this.auth.client.api.getSession({
      headers: request.headers,
    })
    if (!session) throw new UnauthorizedException('Not authenticated')
    return true
  }
}
