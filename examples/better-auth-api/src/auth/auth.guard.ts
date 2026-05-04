import { Injectable, UnauthorizedException } from 'banhmi'
import type { ExecutionContext, Guard } from 'banhmi'
import { auth } from '../auth'

@Injectable()
export class AuthGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.getCtx().request
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new UnauthorizedException('Not authenticated')
    return true
  }
}
