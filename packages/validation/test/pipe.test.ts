import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { RouteCtx } from '@banhmi/common'
import { BadRequestException, Controller, Module, Post } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { z } from 'zod'
import { native } from '../src/adapters/native'
import { zod } from '../src/adapters/zod'
import {
  AdaptedValidationPipe,
  ValidationException,
} from '../src/validation.pipe'

describe('AdaptedValidationPipe — unit', () => {
  const schema = native({
    type: 'object',
    shape: { name: 'string' },
    required: ['name'],
  })
  const pipe = new AdaptedValidationPipe(schema)

  test('returns parsed value on success', () => {
    const result = pipe.transform({ name: 'mochi' }, { type: 'body' })
    expect(result).toEqual({ name: 'mochi' })
  })

  test('throws ValidationException (BadRequestException subclass) on failure', () => {
    expect(() => pipe.transform({ name: 42 }, { type: 'body' })).toThrow(
      ValidationException,
    )
    expect(() => pipe.transform({ name: 42 }, { type: 'body' })).toThrow(
      BadRequestException,
    )
  })

  test('thrown exception carries structured errors array', () => {
    let caught: unknown
    try {
      pipe.transform({}, { type: 'body' })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(ValidationException)
    const exc = caught as ValidationException
    expect(exc.errors).toBeArray()
    expect(exc.errors.length).toBeGreaterThan(0)
    expect(exc.statusCode).toBe(400)
  })

  test('exception message is a JSON string with errors', () => {
    let caught: unknown
    try {
      pipe.transform({ name: 99 }, { type: 'body' })
    } catch (e) {
      caught = e
    }
    const exc = caught as ValidationException
    const parsed = JSON.parse(exc.message)
    expect(parsed).toHaveProperty('message', 'Validation failed')
    expect(parsed.errors).toBeArray()
  })

  test('works with zod validator', () => {
    const zodPipe = new AdaptedValidationPipe(
      zod(z.object({ age: z.number() })),
    )
    expect(() => zodPipe.transform({ age: 'x' }, { type: 'body' })).toThrow(
      ValidationException,
    )
    expect(zodPipe.transform({ age: 5 }, { type: 'body' })).toEqual({ age: 5 })
  })
})

describe('AdaptedValidationPipe — HTTP integration', () => {
  const createCatSchema = native({
    type: 'object',
    shape: { name: 'string' },
    required: ['name'],
  })
  const pipe = new AdaptedValidationPipe(createCatSchema)

  @Controller('/cats')
  class CatsController {
    @Post()
    async create(ctx: RouteCtx) {
      const body = await ctx.json()
      const dto = pipe.transform(body, { type: 'body' })
      return dto
    }
  }

  @Module({ controllers: [CatsController] })
  class AppModule {}

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

  test('accepts valid body with 200', async () => {
    const res = await fetch(`${base}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'mochi' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ name: 'mochi' })
  })

  test('rejects malformed body with 400', async () => {
    const res = await fetch(`${base}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 42 }),
    })
    expect(res.status).toBe(400)
  })

  test('rejects missing required field with 400', async () => {
    const res = await fetch(`${base}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ age: 1 }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('message')
  })
})
