import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { JwtService } from '@banhmi/jwt'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module } from 'banhmi'
import type { JWTPayload } from 'jose'
import { getAuthUser, UseAuth } from '../src/decorators'
import { JwtStrategy } from '../src/strategies/jwt'

const SECRET = 'test-jwt-secret-32-bytes-long!!'

const jwtService = new JwtService({ secret: SECRET, expiresIn: '1h' })
const _expiredService = new JwtService({ secret: SECRET })

const jwtStrategy = new JwtStrategy({ secret: SECRET })

type Payload = JWTPayload & { sub: string; role: string }

@Controller()
class MeController {
  @Get('/me')
  @UseAuth('jwt', [jwtStrategy])
  me(ctx: Parameters<typeof getAuthUser>[0]) {
    const user = getAuthUser<Payload>(ctx)
    return { user }
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({ controllers: [MeController] })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

describe('JwtStrategy', () => {
  test('valid bearer token returns 200 with payload', async () => {
    const token = await jwtService.sign({ sub: 'user-1', role: 'admin' })
    const res = await fetch(`${base}/me`, {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.sub).toBe('user-1')
    expect(body.user.role).toBe('admin')
  })

  test('missing Authorization header returns 401', async () => {
    const res = await fetch(`${base}/me`)
    expect(res.status).toBe(401)
  })

  test('non-Bearer scheme returns 401', async () => {
    const token = await jwtService.sign({ sub: 'user-2' })
    const res = await fetch(`${base}/me`, {
      headers: { authorization: `Basic ${token}` },
    })
    expect(res.status).toBe(401)
  })

  test('malformed token returns 401', async () => {
    const res = await fetch(`${base}/me`, {
      headers: { authorization: 'Bearer not.a.valid.jwt' },
    })
    expect(res.status).toBe(401)
  })

  test('token signed with wrong secret returns 401', async () => {
    const otherService = new JwtService({
      secret: 'completely-different-secret-abc',
    })
    const token = await otherService.sign({ sub: 'user-3' })
    const res = await fetch(`${base}/me`, {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(401)
  })

  test('expired token returns 401', async () => {
    // Sign with a 1-second expiry, then wait for it to expire
    const shortService = new JwtService({ secret: SECRET, expiresIn: '1s' })
    const token = await shortService.sign({ sub: 'user-exp' })
    // Wait 1100ms to ensure the token has expired
    await new Promise((r) => setTimeout(r, 1100))
    const res = await fetch(`${base}/me`, {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(401)
  })

  test('custom extractor (query param)', async () => {
    const queryStrategy = new JwtStrategy({
      secret: SECRET,
      extract: (req) => new URL(req.url).searchParams.get('token'),
    })

    @Controller()
    class QueryController {
      @Get('/query-auth')
      @UseAuth('jwt', [queryStrategy])
      handler(ctx: Parameters<typeof getAuthUser>[0]) {
        return { user: getAuthUser(ctx) }
      }
    }

    @Module({ controllers: [QueryController] })
    class QueryModule {}

    const qApp = await BanhmiFactory.create(QueryModule)
    await qApp.listen(0)
    const qBase = qApp.getUrl()

    const token = await jwtService.sign({ sub: 'query-user' })
    const res = await fetch(`${qBase}/query-auth?token=${token}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.sub).toBe('query-user')

    await qApp.close()
  })

  test('unknown strategy name returns 500', async () => {
    @Controller()
    class UnknownController {
      @Get('/unknown')
      @UseAuth('does-not-exist', [])
      handler(_ctx: Parameters<typeof getAuthUser>[0]) {
        return { ok: true }
      }
    }

    @Module({ controllers: [UnknownController] })
    class UnknownModule {}

    const uApp = await BanhmiFactory.create(UnknownModule)
    await uApp.listen(0)
    const uBase = uApp.getUrl()

    const res = await fetch(`${uBase}/unknown`)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.message).toContain('does-not-exist')

    await uApp.close()
  })
})

describe('bearerToken extractor', () => {
  test('returns token from valid Authorization header', async () => {
    const { bearerToken } = await import('../src/strategies/jwt')
    const req = new Request('http://localhost/', {
      headers: { authorization: 'Bearer abc123' },
    })
    expect(bearerToken(req)).toBe('abc123')
  })

  test('returns null when header is missing', async () => {
    const { bearerToken } = await import('../src/strategies/jwt')
    const req = new Request('http://localhost/')
    expect(bearerToken(req)).toBeNull()
  })

  test('returns null for non-Bearer scheme', async () => {
    const { bearerToken } = await import('../src/strategies/jwt')
    const req = new Request('http://localhost/', {
      headers: { authorization: 'Basic abc123' },
    })
    expect(bearerToken(req)).toBeNull()
  })
})
