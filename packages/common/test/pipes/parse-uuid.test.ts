import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '../../src/exceptions/http-exceptions'
import { ParseUUIDPipe } from '../../src/pipes/parse-uuid.pipe'

describe('ParseUUIDPipe', () => {
  const pipe = new ParseUUIDPipe()

  test('accepts valid UUID v4', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(pipe.transform(uuid, { type: 'param' })).toBe(uuid)
  })

  test('throws for invalid UUID', () => {
    expect(() => pipe.transform('not-a-uuid', { type: 'param' })).toThrow(BadRequestException)
  })
})
