import { describe, expect, test } from 'bun:test'
import {
  ArrayMaxSize,
  ArrayMinSize,
  classValidator,
  IsArray,
} from '../../src/class-validator'

describe('@IsArray', () => {
  class Dto {
    @IsArray()
    tags!: string[]
  }
  const v = classValidator(Dto)

  test('accepts array', () =>
    expect(v.safeParse({ tags: ['a', 'b'] }).ok).toBe(true))
  test('accepts empty array', () =>
    expect(v.safeParse({ tags: [] }).ok).toBe(true))

  test('rejects string', () => {
    const r = v.safeParse({ tags: 'not-array' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('array')
  })

  test('rejects object', () => expect(v.safeParse({ tags: {} }).ok).toBe(false))
})

describe('@ArrayMinSize', () => {
  class Dto {
    @ArrayMinSize(1)
    items!: string[]
  }
  const v = classValidator(Dto)

  test('accepts array meeting minimum', () => {
    expect(v.safeParse({ items: ['x'] }).ok).toBe(true)
  })

  test('accepts array exceeding minimum', () => {
    expect(v.safeParse({ items: ['x', 'y', 'z'] }).ok).toBe(true)
  })

  test('rejects empty array', () => {
    const r = v.safeParse({ items: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('1')
  })
})

describe('@ArrayMaxSize', () => {
  class Dto {
    @ArrayMaxSize(3)
    tags!: string[]
  }
  const v = classValidator(Dto)

  test('accepts array within maximum', () => {
    expect(v.safeParse({ tags: ['a', 'b'] }).ok).toBe(true)
  })

  test('accepts array at exact maximum', () => {
    expect(v.safeParse({ tags: ['a', 'b', 'c'] }).ok).toBe(true)
  })

  test('rejects array exceeding maximum', () => {
    const r = v.safeParse({ tags: ['a', 'b', 'c', 'd'] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('3')
  })
})
