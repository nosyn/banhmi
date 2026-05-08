import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { RouteCtx } from '@banhmi/common'
import { JwtService } from '@banhmi/jwt'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module, Post } from 'banhmi'
import { AuthUser, getAuthUser, UseAuth } from '../src/decorators'
import { JwtStrategy } from '../src/strategies/jwt'
import { LocalStrategy } from '../src/strategies/local'

const SECRET = 'decorator-test-secret-32chars!!'
const jwtSvc = new JwtService({ secret: SECRET })

const localStrategy = new LocalStrategy({
  validate: async ({ username, password }) =>
    username === 'admin' && password === 'pass' ? { id: '1', username } : null,
})

const jwtStrategy = new JwtStrategy({ secret: SECRET })

// ---- @UseAuth + @AuthUser decorators ----

@Controller()
class DecoratorController {
  @Post('/auth-local')
  @UseAuth('local', [localStrategy])
  @AuthUser()
  localHandler(ctx: RouteCtx) {
    return { user: getAuthUser(ctx) }
  }

  @Get('/auth-jwt')
  @UseAuth('jwt', [jwtStrategy])
  @AuthUser()
  jwtHandler(ctx: RouteCtx) {
    return { user: getAuthUser(ctx) }
  }

  @Get('/public')
  pub() {
    return { ok: true }
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({ controllers: [DecoratorController] })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

describe('@UseAuth decorator', () => {
  test('@UseAuth("local"): authenticated request returns 200', async () => {
    const res = await fetch(`${base}/auth-local`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'pass' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.username).toBe('admin')
  })

  test('@UseAuth("local"): unauthenticated request returns 401', async () => {
    const res = await fetch(`${base}/auth-local`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    })
    expect(res.status).toBe(401)
  })

  test('@UseAuth("jwt"): authenticated request returns 200', async () => {
    const token = await jwtSvc.sign({ sub: 'jwt-user' })
    const res = await fetch(`${base}/auth-jwt`, {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.sub).toBe('jwt-user')
  })

  test('@UseAuth("jwt"): unauthenticated request returns 401', async () => {
    const res = await fetch(`${base}/auth-jwt`)
    expect(res.status).toBe(401)
  })

  test('public route unaffected', async () => {
    const res = await fetch(`${base}/public`)
    expect(res.status).toBe(200)
  })
})

describe('getAuthUser helper', () => {
  test('returns null when user not set on ctx', () => {
    const ctx = {
      request: new Request('http://localhost/'),
      params: {},
      query: new URLSearchParams(),
      headers: new Headers(),
      ip: '127.0.0.1',
      state: {},
      json: async () => ({}),
      text: async () => '',
      formData: async () => new FormData(),
    } as RouteCtx
    expect(getAuthUser(ctx)).toBeNull()
  })

  test('returns user when set by @UseAuth', async () => {
    const token = await jwtSvc.sign({ sub: 'check-user' })
    const res = await fetch(`${base}/auth-jwt`, {
      headers: { authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    expect(body.user.sub).toBe('check-user')
  })
})

describe('@AuthUser decorator', () => {
  test('@AuthUser is a no-op — does not break handler execution', async () => {
    const token = await jwtSvc.sign({ sub: 'noop-user' })
    const res = await fetch(`${base}/auth-jwt`, {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })
})
