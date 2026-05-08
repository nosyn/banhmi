import { describe, expect, test } from 'bun:test'
import { DateScalar, JsonScalar, UuidScalar } from '../src/scalars'

// ---------------------------------------------------------------------------
// DateScalar
// ---------------------------------------------------------------------------
describe('DateScalar', () => {
  test('serializes Date to ISO-8601 string', () => {
    const d = new Date('2024-01-15T12:00:00.000Z')
    expect(DateScalar.serialize(d)).toBe('2024-01-15T12:00:00.000Z')
  })

  test('serializes ISO string to ISO-8601 string', () => {
    expect(DateScalar.serialize('2024-06-01T00:00:00.000Z')).toBe(
      '2024-06-01T00:00:00.000Z',
    )
  })

  test('serializes numeric timestamp to ISO-8601 string', () => {
    const ts = new Date('2024-01-01T00:00:00.000Z').getTime()
    expect(DateScalar.serialize(ts)).toBe('2024-01-01T00:00:00.000Z')
  })

  test('throws on invalid value', () => {
    expect(() => DateScalar.serialize({})).toThrow()
  })

  test('parses valid ISO string to Date', () => {
    const result = DateScalar.parseValue('2024-01-15T12:00:00.000Z')
    expect(result).toBeInstanceOf(Date)
    expect((result as Date).toISOString()).toBe('2024-01-15T12:00:00.000Z')
  })

  test('throws on invalid parse value', () => {
    expect(() => DateScalar.parseValue('not-a-date')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// JsonScalar
// ---------------------------------------------------------------------------
describe('JsonScalar', () => {
  test('serializes any JSON-compatible value', () => {
    expect(JsonScalar.serialize({ a: 1, b: [2, 3] })).toEqual({ a: 1, b: [2, 3] })
    expect(JsonScalar.serialize(42)).toBe(42)
    expect(JsonScalar.serialize('hello')).toBe('hello')
    expect(JsonScalar.serialize(null)).toBeNull()
  })

  test('parses any JSON-compatible value', () => {
    expect(JsonScalar.parseValue({ key: 'value' })).toEqual({ key: 'value' })
    expect(JsonScalar.parseValue([1, 2, 3])).toEqual([1, 2, 3])
  })
})

// ---------------------------------------------------------------------------
// UuidScalar
// ---------------------------------------------------------------------------
describe('UuidScalar', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'

  test('serializes a valid UUID', () => {
    expect(UuidScalar.serialize(validUuid)).toBe(validUuid)
  })

  test('parses a valid UUID', () => {
    expect(UuidScalar.parseValue(validUuid)).toBe(validUuid)
  })

  test('throws on invalid UUID during serialize', () => {
    expect(() => UuidScalar.serialize('not-a-uuid')).toThrow()
  })

  test('throws on invalid UUID during parseValue', () => {
    expect(() => UuidScalar.parseValue('12345')).toThrow()
  })

  test('accepts uppercase UUIDs', () => {
    const upper = validUuid.toUpperCase()
    expect(UuidScalar.serialize(upper)).toBe(upper)
  })
})
