import { describe, expect, test } from 'bun:test'
import { classValidator, IsBoolean } from '../../src/class-validator'

describe('@IsBoolean', () => {
  class Dto {
    @IsBoolean()
    active!: boolean
  }
  const v = classValidator(Dto)

  test('accepts true', () =>
    expect(v.safeParse({ active: true }).ok).toBe(true))
  test('accepts false', () =>
    expect(v.safeParse({ active: false }).ok).toBe(true))

  test('rejects string "true"', () => {
    const r = v.safeParse({ active: 'true' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('boolean')
  })

  test('rejects number 1', () => {
    expect(v.safeParse({ active: 1 }).ok).toBe(false)
  })

  test('rejects null', () => {
    expect(v.safeParse({ active: null }).ok).toBe(false)
  })
})
