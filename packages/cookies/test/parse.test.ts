import { describe, expect, test } from 'bun:test'
import { parseCookies, serializeCookie } from '../src'

// ─── parseCookies ─────────────────────────────────────────────────────────────

describe('parseCookies', () => {
  test('parses a single cookie', () => {
    expect(parseCookies('uid=abc')).toEqual({ uid: 'abc' })
  })

  test('parses multiple cookies', () => {
    expect(parseCookies('uid=abc; token=xyz')).toEqual({
      uid: 'abc',
      token: 'xyz',
    })
  })

  test('decodes URL-encoded values', () => {
    expect(parseCookies('name=hello%20world')).toEqual({ name: 'hello world' })
  })

  test('strips surrounding double-quotes', () => {
    expect(parseCookies('quoted="hello"')).toEqual({ quoted: 'hello' })
  })

  test('returns empty object for empty string', () => {
    expect(parseCookies('')).toEqual({})
  })

  test('ignores entries without an equals sign', () => {
    expect(parseCookies('invalid; uid=abc')).toEqual({ uid: 'abc' })
  })

  test('handles cookies with = inside value', () => {
    // base64 padding
    const result = parseCookies('tok=abc==xyz')
    // First = is the separator, so value is 'abc==xyz'
    expect(result.tok).toBe('abc==xyz')
  })
})

// ─── serializeCookie ──────────────────────────────────────────────────────────

describe('serializeCookie', () => {
  test('serializes name and value with URL encoding', () => {
    expect(serializeCookie('uid', 'hello world')).toBe('uid=hello%20world')
  })

  test('adds Path attribute', () => {
    expect(serializeCookie('uid', 'abc', { path: '/' })).toBe('uid=abc; Path=/')
  })

  test('adds Max-Age attribute', () => {
    expect(serializeCookie('uid', 'abc', { maxAge: 3600 })).toBe(
      'uid=abc; Max-Age=3600',
    )
  })

  test('adds HttpOnly attribute', () => {
    expect(serializeCookie('uid', 'abc', { httpOnly: true })).toContain(
      'HttpOnly',
    )
  })

  test('adds Secure attribute', () => {
    expect(serializeCookie('uid', 'abc', { secure: true })).toContain('Secure')
  })

  test('adds SameSite=Lax', () => {
    expect(serializeCookie('uid', 'abc', { sameSite: 'lax' })).toContain(
      'SameSite=Lax',
    )
  })

  test('adds SameSite=Strict', () => {
    expect(serializeCookie('uid', 'abc', { sameSite: 'strict' })).toContain(
      'SameSite=Strict',
    )
  })

  test('combines multiple attributes', () => {
    const result = serializeCookie('uid', 'abc', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 86400,
    })
    expect(result).toContain('uid=abc')
    expect(result).toContain('Path=/')
    expect(result).toContain('HttpOnly')
    expect(result).toContain('Secure')
    expect(result).toContain('SameSite=Lax')
    expect(result).toContain('Max-Age=86400')
  })
})
