import { describe, expect, test } from 'bun:test'
import { resolveVersion } from '../src/version-resolver'

// ─── URI strategy ─────────────────────────────────────────────────────────────

describe('resolveVersion — uri', () => {
  const opts = { type: 'uri' as const, prefix: 'v' }

  test('extracts version from /v1/cats', () => {
    const req = new Request('http://localhost/v1/cats')
    expect(resolveVersion(req, opts)).toBe('1')
  })

  test('extracts version from /v2/cats/123', () => {
    const req = new Request('http://localhost/v2/cats/123')
    expect(resolveVersion(req, opts)).toBe('2')
  })

  test('extracts version from /v10/', () => {
    const req = new Request('http://localhost/v10/')
    expect(resolveVersion(req, opts)).toBe('10')
  })

  test('returns null when no version prefix is present', () => {
    const req = new Request('http://localhost/cats')
    expect(resolveVersion(req, opts)).toBeNull()
  })

  test('returns defaultVersion when path has no version', () => {
    const req = new Request('http://localhost/cats')
    expect(
      resolveVersion(req, { type: 'uri', prefix: 'v', defaultVersion: '1' }),
    ).toBe('1')
  })

  test('supports custom prefix "api/v"', () => {
    const req = new Request('http://localhost/api/v3/users')
    expect(resolveVersion(req, { type: 'uri', prefix: 'api/v' })).toBe('3')
  })
})

// ─── Header strategy ──────────────────────────────────────────────────────────

describe('resolveVersion — header', () => {
  const opts = { type: 'header' as const, header: 'X-API-Version' }

  test('returns header value when present', () => {
    const req = new Request('http://localhost/cats', {
      headers: { 'X-API-Version': '2' },
    })
    expect(resolveVersion(req, opts)).toBe('2')
  })

  test('returns null when header is absent and no default', () => {
    const req = new Request('http://localhost/cats')
    expect(resolveVersion(req, opts)).toBeNull()
  })

  test('returns defaultVersion when header is absent', () => {
    const req = new Request('http://localhost/cats')
    expect(
      resolveVersion(req, {
        type: 'header',
        header: 'X-API-Version',
        defaultVersion: '1',
      }),
    ).toBe('1')
  })

  test('trims whitespace from header value', () => {
    const req = new Request('http://localhost/cats', {
      headers: { 'X-API-Version': '  3  ' },
    })
    expect(resolveVersion(req, opts)).toBe('3')
  })
})

// ─── Media-type strategy ──────────────────────────────────────────────────────

describe('resolveVersion — media-type', () => {
  const opts = { type: 'media-type' as const, key: 'myapi' }

  test('parses version from Accept header', () => {
    const req = new Request('http://localhost/cats', {
      headers: { accept: 'application/vnd.myapi.v2+json' },
    })
    expect(resolveVersion(req, opts)).toBe('2')
  })

  test('returns null when Accept header has no vendor type', () => {
    const req = new Request('http://localhost/cats', {
      headers: { accept: 'application/json' },
    })
    expect(resolveVersion(req, opts)).toBeNull()
  })

  test('returns defaultVersion when Accept header absent', () => {
    const req = new Request('http://localhost/cats')
    expect(
      resolveVersion(req, {
        type: 'media-type',
        key: 'myapi',
        defaultVersion: '1',
      }),
    ).toBe('1')
  })

  test('handles mixed Accept with correct vendor type', () => {
    const req = new Request('http://localhost/cats', {
      headers: {
        accept:
          'text/html, application/json, application/vnd.myapi.v3+json;q=0.9',
      },
    })
    expect(resolveVersion(req, opts)).toBe('3')
  })

  test('key is case-insensitive in matching', () => {
    const req = new Request('http://localhost/cats', {
      headers: { accept: 'application/vnd.MYAPI.v1+json' },
    })
    expect(resolveVersion(req, opts)).toBe('1')
  })
})
