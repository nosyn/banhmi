import { hashPassword, verifyPassword } from '@banhmi/crypto'
import { Throttle } from '@banhmi/throttler'
import type { RouteCtx } from 'banhmi'
import { Controller, Post } from 'banhmi'

interface LegacyUser {
  email: string
  passwordHash: string
}

// In-memory store for demo purposes only — no persistence.
const users = new Map<string, LegacyUser>()

/**
 * Demo controller that shows `@banhmi/crypto` password hashing on a "legacy"
 * login flow that sits alongside better-auth.
 *
 * Endpoints:
 *   POST /api/legacy/register  — hash a password and store the user
 *   POST /api/legacy/login     — verify the password hash
 *
 * Both endpoints are throttled at 5 requests / 60 s to protect against
 * brute-force attacks.
 */
@Controller('/api/legacy')
export class LegacyController {
  static inject = [] as const

  @Post('/register')
  @Throttle({ ttl: 60_000, limit: 5 })
  async register(ctx: RouteCtx) {
    const body = await ctx.json<{ email: string; password: string }>()
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ message: 'email and password are required' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      )
    }
    if (users.has(body.email)) {
      return new Response(JSON.stringify({ message: 'email already in use' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      })
    }
    const passwordHash = await hashPassword(body.password)
    users.set(body.email, { email: body.email, passwordHash })
    return new Response(JSON.stringify({ message: 'registered' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })
  }

  @Post('/login')
  @Throttle({ ttl: 60_000, limit: 5 })
  async login(ctx: RouteCtx) {
    const body = await ctx.json<{ email: string; password: string }>()
    const stored = users.get(body.email)
    if (!stored) {
      return new Response(JSON.stringify({ message: 'invalid credentials' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    const ok = await verifyPassword(body.password, stored.passwordHash)
    if (!ok) {
      return new Response(JSON.stringify({ message: 'invalid credentials' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    return { message: 'ok', email: stored.email }
  }
}
