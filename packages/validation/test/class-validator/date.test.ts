import { describe, expect, test } from 'bun:test'
import { classValidator, IsDate } from '../../src/class-validator'

describe('@IsDate', () => {
  class Dto {
    @IsDate()
    createdAt!: Date
  }
  const v = classValidator(Dto)

  test('accepts valid Date instance', () => {
    expect(v.safeParse({ createdAt: new Date() }).ok).toBe(true)
  })

  test('accepts past Date', () => {
    expect(v.safeParse({ createdAt: new Date('2020-01-01') }).ok).toBe(true)
  })

  test('rejects Invalid Date', () => {
    const r = v.safeParse({ createdAt: new Date('not-a-date') })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('Date')
  })

  test('rejects date string (not a Date object)', () => {
    const r = v.safeParse({ createdAt: '2024-01-01' })
    expect(r.ok).toBe(false)
  })

  test('rejects number timestamp', () => {
    expect(v.safeParse({ createdAt: Date.now() }).ok).toBe(false)
  })
})
