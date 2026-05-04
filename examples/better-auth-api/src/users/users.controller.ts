import type { RouteCtx } from 'banhmi'
import { Controller, Get, UseGuards } from 'banhmi'
import { AuthGuard } from '../auth/auth.guard'
import { AuthService } from '../auth/auth.service'

interface SessionUser {
  id: string
  email: string
  name: string
  createdAt: Date
}

@Controller('/users')
export class UsersController {
  static inject = [AuthService] as const

  constructor(private auth: AuthService) {}

  @Get('/ping')
  ping() {
    return { message: 'pong', timestamp: Date.now() }
  }

  @Get('/me')
  @UseGuards(AuthGuard)
  async getMe(ctx: RouteCtx): Promise<SessionUser | null> {
    const session = await this.auth.client.api.getSession({
      headers: ctx.headers,
    })
    return session?.user as SessionUser | null
  }
}
