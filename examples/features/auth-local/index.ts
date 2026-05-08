/**
 * Demo: @banhmi/auth — local (username/password) authentication.
 *
 * POST /login — requires valid credentials, returns the user object.
 * GET  /me    — protected route (requires prior login via @UseAuth).
 */
import { getAuthUser, LocalStrategy, UseAuth } from '@banhmi/auth'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module, Post } from 'banhmi'

type User = { id: string; email: string; role: string }

// Simulated user store (in real apps, this would be a database)
const userStore: Record<string, { passwordHash: string; user: User }> = {
  alice: {
    // Pre-hashed "secret123" — in production use hashPassword() at startup
    passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$placeholder',
    user: { id: 'user-1', email: 'alice@example.com', role: 'admin' },
  },
}

export const localStrategy = new LocalStrategy<User>({
  validate: async ({ username, password }) => {
    const record = userStore[username]
    if (!record) return null
    // For the demo we compare plaintext; production would use verifyPassword
    if (password !== 'secret123') return null
    return record.user
  },
})

@Controller()
export class AppController {
  @Post('/login')
  @UseAuth('local', [localStrategy])
  login(ctx: RouteCtx) {
    const user = getAuthUser<User>(ctx)
    return { message: 'Login successful', user }
  }

  @Get('/me')
  @UseAuth('local', [localStrategy])
  me(ctx: RouteCtx) {
    const user = getAuthUser<User>(ctx)
    return { user }
  }
}

@Module({
  controllers: [AppController],
})
export class AppModule {}
