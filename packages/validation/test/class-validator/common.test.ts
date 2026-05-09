import { describe, expect, test } from 'bun:test'
import {
  classValidator,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from '../../src/class-validator'

describe('@IsOptional', () => {
  class Dto {
    @IsOptional()
    @IsString()
    bio?: string
  }
  const v = classValidator(Dto)

  test('accepts undefined — skips other rules', () => {
    expect(v.safeParse({ bio: undefined }).ok).toBe(true)
  })

  test('accepts null — skips other rules', () => {
    expect(v.safeParse({ bio: null }).ok).toBe(true)
  })

  test('accepts absent key — skips other rules', () => {
    expect(v.safeParse({}).ok).toBe(true)
  })

  test('validates value when present and valid', () => {
    expect(v.safeParse({ bio: 'hello' }).ok).toBe(true)
  })

  test('validates value when present and invalid', () => {
    const r = v.safeParse({ bio: 123 })
    expect(r.ok).toBe(false)
  })
})

describe('@IsDefined', () => {
  class Dto {
    @IsDefined()
    name!: string
  }
  const v = classValidator(Dto)

  test('accepts defined value', () =>
    expect(v.safeParse({ name: 'hello' }).ok).toBe(true))
  test('accepts empty string (is defined)', () =>
    expect(v.safeParse({ name: '' }).ok).toBe(true))

  test('rejects undefined', () => {
    const r = v.safeParse({ name: undefined })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('defined')
  })

  test('rejects null', () => {
    expect(v.safeParse({ name: null }).ok).toBe(false)
  })
})

describe('@IsIn', () => {
  class Dto {
    @IsIn(['admin', 'user', 'guest'])
    role!: string
  }
  const v = classValidator(Dto)

  test('accepts allowed value', () =>
    expect(v.safeParse({ role: 'admin' }).ok).toBe(true))
  test('accepts another allowed value', () =>
    expect(v.safeParse({ role: 'user' }).ok).toBe(true))

  test('rejects disallowed value', () => {
    const r = v.safeParse({ role: 'superuser' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('admin')
  })
})

describe('@Matches', () => {
  class Dto {
    @Matches(/^[a-z]+$/)
    slug!: string
  }
  const v = classValidator(Dto)

  test('accepts matching string', () =>
    expect(v.safeParse({ slug: 'hello' }).ok).toBe(true))

  test('rejects non-matching string', () => {
    const r = v.safeParse({ slug: 'Hello123' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('pattern')
  })
})

describe('@Length', () => {
  class Dto {
    @Length(2, 10)
    username!: string
  }
  const v = classValidator(Dto)

  test('accepts string at lower bound', () =>
    expect(v.safeParse({ username: 'ab' }).ok).toBe(true))
  test('accepts string at upper bound', () =>
    expect(v.safeParse({ username: 'abcdefghij' }).ok).toBe(true))
  test('accepts string within range', () =>
    expect(v.safeParse({ username: 'hello' }).ok).toBe(true))

  test('rejects string too short', () => {
    const r = v.safeParse({ username: 'a' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('2')
  })

  test('rejects string too long', () => {
    expect(v.safeParse({ username: 'abcdefghijk' }).ok).toBe(false)
  })
})

describe('@MinLength', () => {
  class Dto {
    @MinLength(3)
    name!: string
  }
  const v = classValidator(Dto)

  test('accepts string meeting minimum', () =>
    expect(v.safeParse({ name: 'Tom' }).ok).toBe(true))
  test('rejects string below minimum', () => {
    const r = v.safeParse({ name: 'ab' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('3')
  })
})

describe('@MaxLength', () => {
  class Dto {
    @MaxLength(5)
    code!: string
  }
  const v = classValidator(Dto)

  test('accepts string within limit', () =>
    expect(v.safeParse({ code: 'abc' }).ok).toBe(true))
  test('accepts string at exact limit', () =>
    expect(v.safeParse({ code: 'abcde' }).ok).toBe(true))
  test('rejects string over limit', () => {
    expect(v.safeParse({ code: 'abcdef' }).ok).toBe(false)
  })
})
