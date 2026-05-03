import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '../../src/exceptions/http-exceptions'
import { ParseBoolPipe } from '../../src/pipes/parse-bool.pipe'

describe('ParseBoolPipe', () => {
  const pipe = new ParseBoolPipe()

  test('"true" → true', () => {
    expect(pipe.transform('true', { type: 'query' })).toBe(true)
  })

  test('"false" → false', () => {
    expect(pipe.transform('false', { type: 'query' })).toBe(false)
  })

  test('throws for anything else', () => {
    expect(() => pipe.transform('yes', { type: 'query' })).toThrow(BadRequestException)
  })
})
