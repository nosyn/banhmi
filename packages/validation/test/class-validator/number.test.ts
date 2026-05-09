import { describe, expect, test } from 'bun:test'
import {
  classValidator,
  IsFloat,
  IsInt,
  IsNegative,
  IsNumber,
  IsPositive,
  Max,
  Min,
} from '../../src/class-validator'

describe('@IsNumber', () => {
  class Dto {
    @IsNumber()
    value!: number
  }
  const v = classValidator(Dto)

  test('accepts integer', () =>
    expect(v.safeParse({ value: 42 }).ok).toBe(true))
  test('accepts float', () =>
    expect(v.safeParse({ value: 3.14 }).ok).toBe(true))
  test('rejects string', () =>
    expect(v.safeParse({ value: '42' }).ok).toBe(false))
  test('rejects NaN', () => expect(v.safeParse({ value: NaN }).ok).toBe(false))
  test('rejects Infinity', () =>
    expect(v.safeParse({ value: Infinity }).ok).toBe(false))
})

describe('@IsInt', () => {
  class Dto {
    @IsInt()
    count!: number
  }
  const v = classValidator(Dto)

  test('accepts integer', () => expect(v.safeParse({ count: 5 }).ok).toBe(true))
  test('rejects float', () => {
    const r = v.safeParse({ count: 3.14 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('integer')
  })
  test('rejects string', () =>
    expect(v.safeParse({ count: '5' }).ok).toBe(false))
})

describe('@IsFloat', () => {
  class Dto {
    @IsFloat()
    price!: number
  }
  const v = classValidator(Dto)

  test('accepts float', () =>
    expect(v.safeParse({ price: 9.99 }).ok).toBe(true))
  test('accepts integer (is also a float)', () =>
    expect(v.safeParse({ price: 10 }).ok).toBe(true))
  test('rejects NaN', () => expect(v.safeParse({ price: NaN }).ok).toBe(false))
})

describe('@Min', () => {
  class Dto {
    @Min(0)
    age!: number
  }
  const v = classValidator(Dto)

  test('accepts value at min boundary', () =>
    expect(v.safeParse({ age: 0 }).ok).toBe(true))
  test('accepts value above min', () =>
    expect(v.safeParse({ age: 5 }).ok).toBe(true))
  test('rejects value below min', () => {
    const r = v.safeParse({ age: -1 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('0')
  })
})

describe('@Max', () => {
  class Dto {
    @Max(120)
    age!: number
  }
  const v = classValidator(Dto)

  test('accepts value at max boundary', () =>
    expect(v.safeParse({ age: 120 }).ok).toBe(true))
  test('accepts value below max', () =>
    expect(v.safeParse({ age: 50 }).ok).toBe(true))
  test('rejects value above max', () => {
    const r = v.safeParse({ age: 121 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('120')
  })
})

describe('@IsPositive', () => {
  class Dto {
    @IsPositive()
    price!: number
  }
  const v = classValidator(Dto)

  test('accepts positive number', () =>
    expect(v.safeParse({ price: 1 }).ok).toBe(true))
  test('rejects zero', () => expect(v.safeParse({ price: 0 }).ok).toBe(false))
  test('rejects negative number', () =>
    expect(v.safeParse({ price: -5 }).ok).toBe(false))
})

describe('@IsNegative', () => {
  class Dto {
    @IsNegative()
    balance!: number
  }
  const v = classValidator(Dto)

  test('accepts negative number', () =>
    expect(v.safeParse({ balance: -1 }).ok).toBe(true))
  test('rejects zero', () => expect(v.safeParse({ balance: 0 }).ok).toBe(false))
  test('rejects positive number', () =>
    expect(v.safeParse({ balance: 5 }).ok).toBe(false))
})
