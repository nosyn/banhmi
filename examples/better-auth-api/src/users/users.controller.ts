import type { RouteCtx } from 'banhmi'
import { Controller, Get, UseGuards } from 'banhmi'
import { auth } from '../auth'
import { AuthGuard } from '../auth/auth.guard'

interface SessionUser {
  id: string
  email: string
  name: string
  createdAt: Date
}

@Controller('/users')
export class UsersController {
  @Get('/ping')
  ping() {
    return { message: 'pong', timestamp: Date.now() }
  }

  @Get('/me')
  @UseGuards(AuthGuard)
  async getMe(ctx: RouteCtx): Promise<SessionUser | null> {
    const session = await auth.api.getSession({ headers: ctx.headers })
    return session?.user as SessionUser | null
  }
}
