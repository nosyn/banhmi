import { describe, expect, test } from 'bun:test'
import { Token } from '../src/token'

describe('Token', () => {
  test('each call produces a unique symbol', () => {
    const a = Token('greeting')
    const b = Token('greeting')
    expect(a).not.toBe(b)
    expect(typeof a).toBe('symbol')
  })
  test('description is preserved', () => {
    const t = Token('port')
    expect(t.description).toBe('port')
  })
})
