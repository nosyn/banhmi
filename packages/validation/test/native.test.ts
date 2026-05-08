import { describe, expect, test } from 'bun:test'
import { native } from '../src/adapters/native'
import { ValidationFailedError } from '../src/validator'

describe('native adapter — primitive types', () => {
  test('validates a string successfully', () => {
    const v = native('string')
    const r = v.safeParse('hello')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('hello')
  })

  test('rejects non-string for string spec', () => {
    const v = native('string')
    const r = v.safeParse(42)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors).toHaveLength(1)
      expect(r.errors[0].message).toContain('Expected string')
      expect(r.errors[0].path).toEqual([])
    }
  })

  test('validates a number successfully', () => {
    const v = native('number')
    const r = v.safeParse(99)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(99)
  })

  test('rejects non-number for number spec', () => {
    const v = native('number')
    const r = v.safeParse('99')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('Expected number')
  })

  test('validates a boolean successfully', () => {
    const v = native('boolean')
    expect(v.safeParse(true).ok).toBe(true)
    expect(v.safeParse(false).ok).toBe(true)
  })

  test('rejects non-boolean', () => {
    const v = native('boolean')
    const r = v.safeParse('true')
    expect(r.ok).toBe(false)
  })
})

describe('native adapter — object spec', () => {
  const schema = native({
    type: 'object',
    shape: { name: 'string', age: 'number' },
    required: ['name'],
  })

  test('passes a valid object', () => {
    const r = schema.safeParse({ name: 'mochi', age: 2 })
    expect(r.ok).toBe(true)
  })

  test('fails when required field is missing', () => {
    const r = schema.safeParse({ age: 2 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const namePath = r.errors.find((e) => e.path.includes('name'))
      expect(namePath).toBeTruthy()
      expect(namePath?.message).toContain('Required field missing')
    }
  })

  test('fails when field has wrong type', () => {
    const r = schema.safeParse({ name: 42, age: 2 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0].path).toContain('name')
      expect(r.errors[0].message).toContain('Expected string')
    }
  })

  test('rejects non-object input', () => {
    const r = schema.safeParse('not-an-object')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('Expected object')
  })

  test('rejects arrays as objects', () => {
    const r = schema.safeParse([{ name: 'mochi' }])
    expect(r.ok).toBe(false)
  })
})

describe('native adapter — nested object', () => {
  const schema = native({
    type: 'object',
    shape: {
      user: {
        type: 'object',
        shape: { name: 'string' },
        required: ['name'],
      },
    },
    required: ['user'],
  })

  test('passes valid nested object', () => {
    const r = schema.safeParse({ user: { name: 'mochi' } })
    expect(r.ok).toBe(true)
  })

  test('fails with correct nested path', () => {
    const r = schema.safeParse({ user: { name: 42 } })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0].path).toEqual(['user', 'name'])
      expect(r.errors[0].message).toContain('Expected string')
    }
  })
})

describe('native adapter — array spec', () => {
  const schema = native({ type: 'array', of: 'string' })

  test('passes a valid string array', () => {
    const r = schema.safeParse(['a', 'b', 'c'])
    expect(r.ok).toBe(true)
  })

  test('fails when element has wrong type', () => {
    const r = schema.safeParse(['a', 42, 'c'])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0].path).toEqual([1])
    }
  })

  test('fails for non-array input', () => {
    const r = schema.safeParse('not-array')
    expect(r.ok).toBe(false)
  })

  test('passes empty array', () => {
    const r = schema.safeParse([])
    expect(r.ok).toBe(true)
  })
})

describe('native adapter — optional spec', () => {
  const schema = native({ type: 'optional', of: 'string' })

  test('passes undefined', () => {
    const r = schema.safeParse(undefined)
    expect(r.ok).toBe(true)
  })

  test('passes null', () => {
    const r = schema.safeParse(null)
    expect(r.ok).toBe(true)
  })

  test('passes string', () => {
    const r = schema.safeParse('hello')
    expect(r.ok).toBe(true)
  })

  test('fails when value present but wrong type', () => {
    const r = schema.safeParse(42)
    expect(r.ok).toBe(false)
  })
})

describe('native adapter — optional field in object', () => {
  const schema = native({
    type: 'object',
    shape: {
      name: 'string',
      bio: { type: 'optional', of: 'string' },
    },
    required: ['name'],
  })

  test('passes with optional field absent', () => {
    const r = schema.safeParse({ name: 'mochi' })
    expect(r.ok).toBe(true)
  })

  test('passes with optional field present', () => {
    const r = schema.safeParse({ name: 'mochi', bio: 'a cat' })
    expect(r.ok).toBe(true)
  })
})

describe('native adapter — parse() throwing', () => {
  test('parse throws ValidationFailedError on failure', () => {
    const v = native('string')
    expect(() => v.parse(42)).toThrow(ValidationFailedError)
  })

  test('parse returns value on success', () => {
    const v = native('string')
    expect(v.parse('hello')).toBe('hello')
  })
})
