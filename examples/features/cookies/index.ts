// Demo: @banhmi/cookies — signed cookie round-trip.
//
// GET /set — signs the value 'demo-user' and returns a Set-Cookie header.
// GET /me  — reads the signed cookie via @SignedCookie and echoes the value.
import type { RouteCtx } from '@banhmi/common'
import {
  CookiesModule,
  getSignedCookie,
  SignedCookie,
  serializeCookie,
  signValue,
} from '@banhmi/cookies'
import { Controller, Get, Module } from 'banhmi'

const DEMO_SECRET = 'demo-secret-for-example'
const COOKIE_NAME = 'uid'

@Controller()
export class DemoController {
  @Get('/set')
  async set(_ctx: RouteCtx) {
    const signed = await signValue('demo-user', DEMO_SECRET)
    const setCookie = serializeCookie(COOKIE_NAME, signed, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    })
    return new Response(JSON.stringify({ set: true }), {
      headers: {
        'content-type': 'application/json',
        'set-cookie': setCookie,
      },
    })
  }

  @Get('/me')
  @SignedCookie(COOKIE_NAME, DEMO_SECRET)
  me(ctx: RouteCtx) {
    return { uid: getSignedCookie(ctx, COOKIE_NAME) }
  }
}

@Module({
  imports: [CookiesModule.forRoot({ secret: DEMO_SECRET })],
  controllers: [DemoController],
})
export class AppModule {}
