import { expect, test, describe } from 'bun:test'
import { Token } from '../src/token'

describe('Token', () => {
  test('each call produces a unique symbol', () => {
    const a = Token<string>('greeting')
    const b = Token<string>('greeting')
    expect(a).not.toBe(b)
    expect(typeof a).toBe('symbol')
  })

  test('description is preserved', () => {
    const t = Token<number>('port')
    expect(t.description).toBe('port')
  })
})
