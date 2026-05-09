import { getAuthUser, JwtStrategy, LocalStrategy, UseAuth } from '@banhmi/auth'
import { JWT_SERVICE_TOKEN, type JwtService } from '@banhmi/jwt'
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@banhmi/openapi'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Injectable, Post } from 'banhmi'
import { config } from '../config'

/** Shape of the authenticated user principal for this app. */
export type AppUser = {
  id: string
  username: string
  role: string
}

/** In-memory user store — swap with a real DB in production. */
const users: Record<string, { passwordHash: string; user: AppUser }> = {
  admin: {
    // Plain-text for demo only; production uses Bun.password.hash
    passwordHash: 'password',
    user: { id: 'user-1', username: 'admin', role: 'admin' },
  },
}

/**
 * Strategy instances are module-scope singletons so they can be referenced
 * by `@UseAuth` at decoration time.
 */
export const localStrategy = new LocalStrategy<AppUser>({
  validate: async ({ username, password }) => {
    const record = users[username]
    if (!record) return null
    // Demo: compare plaintext. Real apps: Bun.password.verify()
    if (password !== record.passwordHash) return null
    return record.user
  },
})

export const jwtStrategy = new JwtStrategy<AppUser>({
  secret: config.jwtSecret,
})

/**
 * Authentication controller.
 *
 * POST /api/auth/login  — validates credentials, returns a signed JWT.
 * GET  /api/me          — protected; returns the JWT payload.
 */
@ApiTags('auth')
@Controller('/api')
@Injectable()
export class AuthController {
  static inject = [JWT_SERVICE_TOKEN] as const

  constructor(private readonly jwtService: JwtService) {}

  @ApiOperation({ summary: 'Login with username/password' })
  @ApiBody({
    type: 'object',
    description: '{ username, password }',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'JWT access token' })
  @Post('/auth/login')
  @UseAuth('local', [localStrategy])
  async login(ctx: RouteCtx) {
    const user = getAuthUser<AppUser>(ctx)
    const token = await this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    })
    return { accessToken: token }
  }

  @ApiOperation({ summary: 'Get current user (JWT-protected)' })
  @ApiResponse({ status: 200, description: 'JWT payload' })
  @Get('/me')
  @UseAuth('jwt', [jwtStrategy])
  me(ctx: RouteCtx) {
    const user = getAuthUser<AppUser>(ctx)
    return { user }
  }
}
