import { Injectable, UnauthorizedException } from 'banhmi'
import { AuthService } from './auth.service'
@Injectable()
export class AuthGuard {
  auth
  static inject = [AuthService]
  constructor(auth) {
    this.auth = auth
  }
  async canActivate(context) {
    const request = context.getCtx().request
    const session = await this.auth.client.api.getSession({
      headers: request.headers,
    })
    if (!session) throw new UnauthorizedException('Not authenticated')
    return true
  }
}
