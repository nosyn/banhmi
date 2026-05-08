import { describe, expect, test } from 'bun:test'
import { signValue, verifyValue } from '../src'

const SECRET = 'test-secret-key'

describe('signValue / verifyValue', () => {
  test('round-trips a value correctly', async () => {
    const signed = await signValue('user-123', SECRET)
    const result = await verifyValue(signed, SECRET)
    expect(result).toBe('user-123')
  })

  test('signed string contains the original value prefix', async () => {
    const signed = await signValue('hello', SECRET)
    expect(signed.startsWith('hello.')).toBe(true)
  })

  test('returns null for a bad signature', async () => {
    const result = await verifyValue('user-123.INVALIDSIG', SECRET)
    expect(result).toBeNull()
  })

  test('returns null when tampered value changes the signature check', async () => {
    const signed = await signValue('original', SECRET)
    // Replace the value part with a different value but keep the signature
    const dotIdx = signed.lastIndexOf('.')
    const sig = signed.slice(dotIdx)
    const tampered = `tampered${sig}`
    const result = await verifyValue(tampered, SECRET)
    expect(result).toBeNull()
  })

  test('returns null for string without a dot separator', async () => {
    const result = await verifyValue('nodot', SECRET)
    expect(result).toBeNull()
  })

  test('different secrets produce different signatures', async () => {
    const signed = await signValue('value', 'secret-a')
    const result = await verifyValue(signed, 'secret-b')
    expect(result).toBeNull()
  })

  test('handles values containing dots', async () => {
    const value = 'a.b.c'
    const signed = await signValue(value, SECRET)
    const result = await verifyValue(signed, SECRET)
    expect(result).toBe(value)
  })
})
