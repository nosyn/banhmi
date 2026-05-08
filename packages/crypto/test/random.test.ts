import { expect, test } from 'bun:test'
import {
  fromBase64Url,
  randomBytes,
  randomToken,
  toBase64Url,
} from '../src/random'

test('random: randomBytes returns Uint8Array of given length', () => {
  const bytes = randomBytes(32)
  expect(bytes).toBeInstanceOf(Uint8Array)
  expect(bytes.length).toBe(32)
})

test('random: randomBytes(0) returns empty Uint8Array', () => {
  const bytes = randomBytes(0)
  expect(bytes).toBeInstanceOf(Uint8Array)
  expect(bytes.length).toBe(0)
})

test('random: two randomBytes calls produce different bytes', () => {
  const a = randomBytes(32)
  const b = randomBytes(32)
  // With 256 bits of entropy, collision probability is negligible
  expect(a).not.toEqual(b)
})

test('random: randomToken returns a string', () => {
  const token = randomToken()
  expect(typeof token).toBe('string')
})

test('random: default randomToken has no +, /, or = chars', () => {
  const token = randomToken()
  expect(token).not.toContain('+')
  expect(token).not.toContain('/')
  expect(token).not.toContain('=')
})

test('random: default randomToken is 43 chars (32 bytes base64url)', () => {
  const token = randomToken()
  expect(token.length).toBe(43)
})

test('random: randomToken(16) is 22 chars', () => {
  const token = randomToken(16)
  expect(token.length).toBe(22)
})

test('random: two randomToken calls produce different values', () => {
  const a = randomToken()
  const b = randomToken()
  expect(a).not.toBe(b)
})

test('random: toBase64Url / fromBase64Url round-trips', () => {
  const bytes = randomBytes(32)
  const encoded = toBase64Url(bytes)
  const decoded = fromBase64Url(encoded)
  expect(decoded).toEqual(bytes)
})

test('random: toBase64Url has no +, /, or = chars', () => {
  const bytes = randomBytes(32)
  const encoded = toBase64Url(bytes)
  expect(encoded).not.toContain('+')
  expect(encoded).not.toContain('/')
  expect(encoded).not.toContain('=')
})
