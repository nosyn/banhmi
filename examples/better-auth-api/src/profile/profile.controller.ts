import { getAuthUser, JwtStrategy, UseAuth } from '@banhmi/auth'
import type { RouteCtx } from 'banhmi'
import { Controller, Get } from 'banhmi'
import type { JWTPayload } from 'jose'

// Single shared JWT strategy instance — secret read at module load time so it
// is available when the decorator runs.
const JWT_SECRET = Bun.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-prod'

const jwtStrategy = new JwtStrategy({ secret: JWT_SECRET })

interface JwtPrincipal extends JWTPayload {
  sub: string
  email?: string
}

/**
 * Protected resource that demonstrates `@UseAuth('jwt')` alongside the
 * existing better-auth session flow.
 *
 * GET /api/profile  — requires `Authorization: Bearer <jwt>`.
 */
@Controller('/api/profile')
export class ProfileController {
  static inject = [] as const

  @Get()
  @UseAuth('jwt', [jwtStrategy])
  getProfile(ctx: RouteCtx) {
    const user = getAuthUser<JwtPrincipal>(ctx)
    return { principal: user }
  }
}
