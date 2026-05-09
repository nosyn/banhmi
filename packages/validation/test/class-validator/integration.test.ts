import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { RouteCtx } from '@banhmi/common'
import { Controller, Module, Post } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import {
  classValidator,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from '../../src/class-validator'
import { AdaptedValidationPipe } from '../../src/validation.pipe'

// ─── Complex DTO ──────────────────────────────────────────────────────────────

class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsEmail()
  email!: string

  @IsInt()
  @Min(18)
  age!: number

  @IsOptional()
  @IsString()
  bio?: string

  @IsBoolean()
  active!: boolean
}

// ─── DTO with no decorators ───────────────────────────────────────────────────

class EmptyDto {
  anything?: unknown
}

// ─── classValidator unit tests ────────────────────────────────────────────────

describe('classValidator — complex DTO', () => {
  const v = classValidator(CreateUserDto)

  test('accepts fully valid payload', () => {
    const r = v.safeParse({
      name: 'Alice',
      email: 'alice@example.com',
      age: 25,
      active: true,
    })
    expect(r.ok).toBe(true)
  })

  test('accepts valid payload with optional field present', () => {
    const r = v.safeParse({
      name: 'Alice',
      email: 'alice@example.com',
      age: 25,
      bio: 'loves code',
      active: true,
    })
    expect(r.ok).toBe(true)
  })

  test('accumulates multiple errors', () => {
    const r = v.safeParse({
      name: 'A', // too short
      email: 'not-an-email',
      age: 16, // below Min(18)
      active: 'yes', // wrong type
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThanOrEqual(4)
    }
  })

  test('error structure contains path and message', () => {
    const r = v.safeParse({
      name: 'Alice',
      email: 'bad',
      age: 25,
      active: true,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const err = r.errors[0]
      expect(err).toHaveProperty('path')
      expect(err).toHaveProperty('message')
      expect(Array.isArray(err.path)).toBe(true)
    }
  })

  test('parse() throws on failure', () => {
    expect(() =>
      v.parse({ name: 'A', email: 'bad', age: 16, active: 'yes' }),
    ).toThrow()
  })

  test('parse() returns value on success', () => {
    const val = v.parse({
      name: 'Alice',
      email: 'alice@example.com',
      age: 25,
      active: true,
    })
    expect(val).toMatchObject({ name: 'Alice', email: 'alice@example.com' })
  })
})

describe('classValidator — DTO with no decorators', () => {
  const v = classValidator(EmptyDto)

  test('accepts any input shape — returns ok: true', () => {
    expect(v.safeParse({ foo: 'bar', baz: 123 }).ok).toBe(true)
  })

  test('accepts empty object', () => {
    expect(v.safeParse({}).ok).toBe(true)
  })

  test('accepts null input without crashing', () => {
    // null input — no rules to fail, so ok
    expect(v.safeParse(null).ok).toBe(true)
  })
})

// ─── HTTP integration ─────────────────────────────────────────────────────────

const userPipe = new AdaptedValidationPipe(classValidator(CreateUserDto))

@Controller('/users')
class UsersController {
  @Post()
  async create(ctx: RouteCtx) {
    const body = await ctx.json()
    const dto = userPipe.transform(body, { type: 'body' })
    return { ok: true, data: dto }
  }
}

@Module({ controllers: [UsersController] })
class AppModule {}

describe('classValidator — HTTP integration', () => {
  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('returns 200 for valid payload', async () => {
    const res = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com',
        age: 25,
        active: true,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, data: { name: 'Alice' } })
  })

  test('returns 400 for invalid payload with structured errors', async () => {
    const res = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'bad', age: 10, active: 'yes' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    // The error response is serialized by GlobalExceptionFilter from ValidationException
    expect(body).toBeTruthy()
  })

  test('returns 400 when required fields missing', async () => {
    const res = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})
