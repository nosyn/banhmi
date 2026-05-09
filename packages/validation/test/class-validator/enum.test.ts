import { describe, expect, test } from 'bun:test'
import { classValidator, IsEnum } from '../../src/class-validator'

enum Role {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

enum Status {
  Active = 1,
  Inactive = 2,
}

describe('@IsEnum (string enum)', () => {
  class Dto {
    @IsEnum(Role)
    role!: Role
  }
  const v = classValidator(Dto)

  test('accepts valid enum value', () => {
    expect(v.safeParse({ role: 'admin' }).ok).toBe(true)
  })

  test('accepts another valid enum value', () => {
    expect(v.safeParse({ role: 'user' }).ok).toBe(true)
  })

  test('rejects value not in enum', () => {
    const r = v.safeParse({ role: 'superadmin' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('enum')
  })
})

describe('@IsEnum (numeric enum)', () => {
  class Dto {
    @IsEnum(Status)
    status!: Status
  }
  const v = classValidator(Dto)

  test('accepts valid numeric enum value', () => {
    expect(v.safeParse({ status: 1 }).ok).toBe(true)
  })

  test('rejects number not in enum', () => {
    expect(v.safeParse({ status: 99 }).ok).toBe(false)
  })
})
