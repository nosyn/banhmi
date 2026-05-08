import {
  getSignedCookie,
  SignedCookie,
  serializeCookie,
  signValue,
} from '@banhmi/cookies'
import type { RouteCtx } from 'banhmi'
import { Controller, Get } from 'banhmi'

/** The signing secret — use env var in production. */
const COOKIE_SECRET = Bun.env.BANHMI_COOKIE_SECRET ?? 'cats-api-dev-secret'

/**
 * Demonstrates signed cookie round-trip:
 * - `GET /session-id` sets a signed `sid` cookie on first request.
 * - Subsequent requests with the cookie read and verify it.
 */
@Controller()
export class SessionController {
  @Get('/session-id')
  @SignedCookie('sid', COOKIE_SECRET)
  async sessionId(ctx: RouteCtx) {
    const existing = getSignedCookie(ctx, 'sid')
    if (existing !== null) {
      return { sid: existing, fresh: false }
    }

    // Issue a new session id
    const newSid = `sess-${Date.now()}`
    const signedValue = await signValue(newSid, COOKIE_SECRET)
    const cookieHeader = serializeCookie('sid', signedValue, {
      httpOnly: true,
      path: '/',
      maxAge: 3600,
    })
    const body = JSON.stringify({ sid: newSid, fresh: true })
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': cookieHeader,
      },
    })
  }
}
