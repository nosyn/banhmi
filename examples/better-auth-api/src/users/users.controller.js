import { Controller, Get, UseGuards } from 'banhmi'
import { AuthGuard } from '../auth/auth.guard'
import { AuthService } from '../auth/auth.service'
@Controller('/users')
export class UsersController {
  auth
  static inject = [AuthService]
  constructor(auth) {
    this.auth = auth
  }
  @Get('/ping')
  ping() {
    return { message: 'pong', timestamp: Date.now() }
  }
  @Get('/me')
  @UseGuards(AuthGuard)
  async getMe(ctx) {
    const session = await this.auth.client.api.getSession({
      headers: ctx.headers,
    })
    return session?.user
  }
}
