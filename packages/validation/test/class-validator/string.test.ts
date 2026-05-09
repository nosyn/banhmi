import { describe, expect, test } from 'bun:test'
import {
  classValidator,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsURL,
  IsUUID,
} from '../../src/class-validator'

describe('@IsString', () => {
  class Dto {
    @IsString()
    name!: string
  }
  const v = classValidator(Dto)

  test('accepts a string', () => {
    expect(v.safeParse({ name: 'hello' }).ok).toBe(true)
  })

  test('rejects a number', () => {
    const r = v.safeParse({ name: 42 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('string')
  })

  test('rejects null', () => {
    expect(v.safeParse({ name: null }).ok).toBe(false)
  })
})

describe('@IsEmail', () => {
  class Dto {
    @IsEmail()
    email!: string
  }
  const v = classValidator(Dto)

  test('accepts valid email', () => {
    expect(v.safeParse({ email: 'user@example.com' }).ok).toBe(true)
  })

  test('accepts subdomain email', () => {
    expect(v.safeParse({ email: 'user@mail.example.co.uk' }).ok).toBe(true)
  })

  test('rejects plain string', () => {
    const r = v.safeParse({ email: 'not-an-email' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('email')
  })

  test('rejects missing @', () => {
    expect(v.safeParse({ email: 'nodomain' }).ok).toBe(false)
  })
})

describe('@IsUUID', () => {
  class Dto {
    @IsUUID()
    id!: string
  }
  const v = classValidator(Dto)

  test('accepts valid UUID v4', () => {
    expect(v.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' }).ok).toBe(
      true,
    )
  })

  test('rejects non-UUID string', () => {
    const r = v.safeParse({ id: 'not-a-uuid' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('UUID')
  })
})

describe('@IsURL', () => {
  class Dto {
    @IsURL()
    website!: string
  }
  const v = classValidator(Dto)

  test('accepts https URL', () => {
    expect(v.safeParse({ website: 'https://example.com' }).ok).toBe(true)
  })

  test('accepts http URL', () => {
    expect(v.safeParse({ website: 'http://example.com/path?q=1' }).ok).toBe(
      true,
    )
  })

  test('rejects plain string', () => {
    expect(v.safeParse({ website: 'example.com' }).ok).toBe(false)
  })
})

describe('@IsNotEmpty', () => {
  class Dto {
    @IsNotEmpty()
    title!: string
  }
  const v = classValidator(Dto)

  test('accepts non-empty string', () => {
    expect(v.safeParse({ title: 'hello' }).ok).toBe(true)
  })

  test('rejects empty string', () => {
    expect(v.safeParse({ title: '' }).ok).toBe(false)
  })

  test('rejects whitespace-only string', () => {
    expect(v.safeParse({ title: '   ' }).ok).toBe(false)
  })

  test('rejects non-string value', () => {
    expect(v.safeParse({ title: 123 }).ok).toBe(false)
  })
})

describe('@IsString with custom message', () => {
  class Dto {
    @IsString({ message: 'name must be text' })
    name!: string
  }
  const v = classValidator(Dto)

  test('uses custom message on failure', () => {
    const r = v.safeParse({ name: 99 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toBe('name must be text')
  })
})
