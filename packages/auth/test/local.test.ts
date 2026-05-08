import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module, Post } from 'banhmi'
import { getAuthUser, UseAuth } from '../src/decorators'
import { LocalStrategy } from '../src/strategies/local'

type User = { id: string; username: string }

const users: Record<string, { password: string; id: string }> = {
  alice: { password: 'secret123', id: 'user-1' },
}

const localStrategy = new LocalStrategy<User>({
  validate: async ({ username, password }) => {
    const record = users[username]
    if (!record || record.password !== password) return null
    return { id: record.id, username }
  },
})

@Controller()
class AuthController {
  @Post('/login')
  @UseAuth('local', [localStrategy])
  login(ctx: Parameters<typeof getAuthUser>[0]) {
    const user = getAuthUser<User>(ctx)
    return { user }
  }

  @Get('/public')
  public() {
    return { ok: true }
  }
}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  @Module({ controllers: [AuthController] })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

describe('LocalStrategy', () => {
  test('valid credentials return 200 with user', async () => {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'secret123' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toEqual({ id: 'user-1', username: 'alice' })
  })

  test('wrong password returns 401', async () => {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'wrong' }),
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Unauthorized')
  })

  test('unknown user returns 401', async () => {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'nobody', password: 'x' }),
    })
    expect(res.status).toBe(401)
  })

  test('malformed JSON body returns 401', async () => {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{{{',
    })
    expect(res.status).toBe(401)
  })

  test('missing credentials (no content-type) returns 401', async () => {
    const res = await fetch(`${base}/login`, { method: 'POST' })
    expect(res.status).toBe(401)
  })

  test('form-urlencoded credentials work', async () => {
    const params = new URLSearchParams({
      username: 'alice',
      password: 'secret123',
    })
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.username).toBe('alice')
  })

  test('public route remains unaffected', async () => {
    const res = await fetch(`${base}/public`)
    expect(res.status).toBe(200)
  })

  test('custom usernameField and passwordField', async () => {
    type EmailUser = { email: string }

    const emailUsers: Record<string, { pwd: string }> = {
      'bob@example.com': { pwd: 'pass456' },
    }

    const emailStrategy = new LocalStrategy<EmailUser>({
      usernameField: 'email',
      passwordField: 'pwd',
      validate: async ({ username, password }) => {
        const record = emailUsers[username]
        if (!record || record.pwd !== password) return null
        return { email: username }
      },
    })

    @Controller()
    class EmailController {
      @Post('/email-login')
      @UseAuth('local', [emailStrategy])
      login(ctx: Parameters<typeof getAuthUser>[0]) {
        return { user: getAuthUser<EmailUser>(ctx) }
      }
    }

    @Module({ controllers: [EmailController] })
    class EmailModule {}

    const emailApp = await BanhmiFactory.create(EmailModule)
    await emailApp.listen(0)
    const emailBase = emailApp.getUrl()

    const res = await fetch(`${emailBase}/email-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'bob@example.com', pwd: 'pass456' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('bob@example.com')

    await emailApp.close()
  })
})
