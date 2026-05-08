import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { zod } from '../src/adapters/zod'
import { ValidationFailedError } from '../src/validator'

describe('zod adapter', () => {
  const schema = z.object({ name: z.string(), age: z.number().int().min(0) })
  const v = zod(schema)

  test('parses a valid object successfully', () => {
    const r = v.safeParse({ name: 'mochi', age: 2 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe('mochi')
      expect(r.value.age).toBe(2)
    }
  })

  test('fails with structured errors for invalid input', () => {
    const r = v.safeParse({ name: 42, age: -1 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThanOrEqual(1)
      const nameErr = r.errors.find((e) => e.path.includes('name'))
      expect(nameErr).toBeTruthy()
    }
  })

  test('maps Zod path to ValidationError path', () => {
    const nested = z.object({ user: z.object({ name: z.string() }) })
    const v2 = zod(nested)
    const r = v2.safeParse({ user: { name: 42 } })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0].path).toEqual(['user', 'name'])
    }
  })

  test('parse() throws ValidationFailedError on failure', () => {
    expect(() => v.parse({ name: 'ok', age: 'not-a-number' })).toThrow(
      ValidationFailedError,
    )
  })

  test('parse() returns typed value on success', () => {
    const result = v.parse({ name: 'banhmi', age: 1 })
    expect(result.name).toBe('banhmi')
  })

  test('safeParse returns ok:false for missing required field', () => {
    const r = v.safeParse({ age: 2 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThan(0)
    }
  })

  test('safeParse errors have message strings', () => {
    const r = v.safeParse({ name: 'x', age: 'bad' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      for (const err of r.errors) {
        expect(typeof err.message).toBe('string')
      }
    }
  })

  test('works with Zod string schema directly', () => {
    const sv = zod(z.string().min(3))
    expect(sv.safeParse('hi').ok).toBe(false)
    expect(sv.safeParse('hey').ok).toBe(true)
  })
})
