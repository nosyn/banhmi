/**
 * Demo: @banhmi/auth — JWT Bearer token authentication.
 *
 * GET /me — protected route; requires a valid HS256 JWT in Authorization header.
 *
 * In production, issue tokens from a dedicated login endpoint.
 * Here `JwtService` is exported so the test can forge valid tokens.
 */
import { getAuthUser, JwtStrategy, UseAuth } from '@banhmi/auth'
import { JwtService } from '@banhmi/jwt'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module } from 'banhmi'
import type { JWTPayload } from 'jose'

export const JWT_SECRET = Bun.env.JWT_SECRET ?? 'demo-jwt-secret-min-32-chars!!'

export const jwtService = new JwtService({
  secret: JWT_SECRET,
  expiresIn: '1h',
})

const jwtStrategy = new JwtStrategy({ secret: JWT_SECRET })

type Payload = JWTPayload & { sub: string; role?: string }

@Controller()
export class AppController {
  @Get('/me')
  @UseAuth('jwt', [jwtStrategy])
  me(ctx: RouteCtx) {
    const payload = getAuthUser<Payload>(ctx)
    return { user: payload }
  }
}

@Module({
  controllers: [AppController],
})
export class AppModule {}
