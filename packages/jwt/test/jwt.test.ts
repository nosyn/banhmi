import { afterEach, describe, expect, test } from 'bun:test'
import { Module, UnauthorizedException } from '@banhmi/common'
import type { ExecutionContext } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { JwtGuard } from '../src/jwt.guard'
import { JwtModule } from '../src/jwt.module'
import { JwtService } from '../src/jwt.service'
import { JWT_SERVICE_TOKEN } from '../src/tokens'

const SECRET = 'a-very-long-secret-that-is-at-least-32-chars'
const opts = { secret: SECRET, expiresIn: '1h' }

describe('JwtService', () => {
  test('sign produces a JWT string', async () => {
    const svc = new JwtService(opts)
    const token = await svc.sign({ sub: '123', role: 'admin' })
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  test('verify returns the payload for a valid token', async () => {
    const svc = new JwtService(opts)
    const token = await svc.sign({ sub: '42' })
    const payload = await svc.verify(token)
    expect(payload.sub).toBe('42')
  })

  test('verify throws for an expired token', async () => {
    const svc = new JwtService({ secret: SECRET, expiresIn: '1s' })
    const token = await svc.sign({ sub: '1' })
    await Bun.sleep(1100)
    await expect(svc.verify(token)).rejects.toThrow()
  })

  test('verify throws for an invalid token', async () => {
    const svc = new JwtService(opts)
    await expect(svc.verify('invalid.jwt.token')).rejects.toThrow()
  })
})

describe('JwtGuard', () => {
  test('throws UnauthorizedException when no Authorization header', async () => {
    const svc = new JwtService(opts)
    const guard = new JwtGuard(svc)

    const mockCtx = {
      getCtx: () => ({
        request: new Request('http://localhost/'),
        state: {} as Record<string, unknown>,
      }),
    } as unknown as ExecutionContext

    await expect(guard.canActivate(mockCtx)).rejects.toThrow(
      UnauthorizedException,
    )
  })

  test('throws UnauthorizedException for invalid Bearer token', async () => {
    const svc = new JwtService(opts)
    const guard = new JwtGuard(svc)

    const mockCtx = {
      getCtx: () => ({
        request: new Request('http://localhost/', {
          headers: { Authorization: 'Bearer invalid.token' },
        }),
        state: {},
      }),
    } as unknown as ExecutionContext

    await expect(guard.canActivate(mockCtx)).rejects.toThrow(
      UnauthorizedException,
    )
  })

  test('sets jwtPayload on ctx.state for valid token', async () => {
    const svc = new JwtService(opts)
    const guard = new JwtGuard(svc)
    const token = await svc.sign({ sub: '99' })
    const state: Record<string, unknown> = {}

    const mockCtx = {
      getCtx: () => ({
        request: new Request('http://localhost/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        state,
      }),
    } as unknown as ExecutionContext

    const result = await guard.canActivate(mockCtx)
    expect(result).toBe(true)
    expect((state['jwtPayload'] as { sub: string }).sub).toBe('99')
  })
})

describe('JwtModule.forRoot', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('provides JwtService', async () => {
    @Module({ imports: [JwtModule.forRoot(opts)] })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const svc = app.container.resolve(JWT_SERVICE_TOKEN) as JwtService
    const token = await svc.sign({ sub: 'test' })
    expect(typeof token).toBe('string')
  })
})
