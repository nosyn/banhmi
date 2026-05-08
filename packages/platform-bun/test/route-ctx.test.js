import { describe, expect, test } from 'bun:test'
import { BunRouteCtx } from '../src/route-ctx'

describe('BunRouteCtx', () => {
  test('exposes request and params', () => {
    const req = new Request('https://example.com/cats/42')
    const ctx = new BunRouteCtx(req, { id: '42' })
    expect(ctx.request).toBe(req)
    expect(ctx.params).toEqual({ id: '42' })
  })
  test('parses query string', () => {
    const req = new Request('https://example.com/cats?limit=10&page=2')
    const ctx = new BunRouteCtx(req, {})
    expect(ctx.query.get('limit')).toBe('10')
    expect(ctx.query.get('page')).toBe('2')
  })
  test('exposes headers', () => {
    const req = new Request('https://example.com/', {
      headers: { 'content-type': 'application/json' },
    })
    const ctx = new BunRouteCtx(req, {})
    expect(ctx.headers.get('content-type')).toBe('application/json')
  })
  test('json() parses request body', async () => {
    const req = new Request('https://example.com/cats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Whiskers' }),
    })
    const ctx = new BunRouteCtx(req, {})
    const body = await ctx.json()
    expect(body.name).toBe('Whiskers')
  })
  test('text() returns raw body text', async () => {
    const req = new Request('https://example.com/', {
      method: 'POST',
      body: 'hello world',
    })
    const ctx = new BunRouteCtx(req, {})
    expect(await ctx.text()).toBe('hello world')
  })
  test('ip from X-Forwarded-For header', () => {
    const req = new Request('https://example.com/', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    const ctx = new BunRouteCtx(req, {})
    expect(ctx.ip).toBe('1.2.3.4')
  })
  test('ip falls back to "unknown"', () => {
    const req = new Request('https://example.com/')
    const ctx = new BunRouteCtx(req, {})
    expect(ctx.ip).toBe('unknown')
  })
  test('formData() parses form body', async () => {
    const body = new URLSearchParams({ color: 'orange' })
    const req = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const ctx = new BunRouteCtx(req, {})
    const form = await ctx.formData()
    expect(form.get('color')).toBe('orange')
  })
})
