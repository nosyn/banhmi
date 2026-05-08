import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '../../src/exceptions/http-exceptions'
import { ParseIntPipe } from '../../src/pipes/parse-int.pipe'

describe('ParseIntPipe', () => {
  const pipe = new ParseIntPipe()
  test('parses valid integer string', () => {
    expect(pipe.transform('42', { type: 'param' })).toBe(42)
  })
  test('throws BadRequestException for non-integer', () => {
    expect(() => pipe.transform('abc', { type: 'param' })).toThrow(
      BadRequestException,
    )
  })
  test('throws for decimal string', () => {
    expect(() => pipe.transform('3.14', { type: 'param' })).toThrow(
      BadRequestException,
    )
  })
})
