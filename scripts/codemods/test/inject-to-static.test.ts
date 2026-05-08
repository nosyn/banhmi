import { describe, expect, it } from 'bun:test'
import { rewriteInjectToStatic } from '../rewrites/inject-to-static'

describe('rewriteInjectToStatic', () => {
  it('rewrites a single @Inject param to static inject', () => {
    const input = `class CatsService {
  constructor(@Inject(CAT_REPO) private repo: CatRepository) {}
}`
    const out = rewriteInjectToStatic(input)
    expect(out).toContain('static inject = [CAT_REPO] as const')
    expect(out).toContain('constructor(private repo: CatRepository)')
    expect(out).not.toContain('@Inject(CAT_REPO)')
  })

  it('rewrites multiple @Inject params into one tuple', () => {
    const input = `class Svc {
  constructor(
    @Inject(TOKEN_A) private a: ServiceA,
    @Inject(TOKEN_B) private b: ServiceB,
  ) {}
}`
    const out = rewriteInjectToStatic(input)
    expect(out).toContain('static inject = [TOKEN_A, TOKEN_B] as const')
    expect(out).not.toContain('@Inject(TOKEN_A)')
    expect(out).not.toContain('@Inject(TOKEN_B)')
  })

  it('does not alter a constructor without @Inject', () => {
    const input = `class Svc {
  constructor(private a: ServiceA) {}
}`
    expect(rewriteInjectToStatic(input)).toBe(input)
  })

  it('removes Inject from the import list when no usages remain', () => {
    const input = `import { Injectable, Inject } from '@banhmi/common'
class Svc {
  constructor(@Inject(T) private t: T) {}
}`
    const out = rewriteInjectToStatic(input)
    // @Inject(...) call should be gone
    expect(out).not.toContain('@Inject(')
    // Inject should not appear as a standalone import name
    expect(out).not.toMatch(/\bInject\b(?!able)/)
    expect(out).toContain('Injectable')
  })

  it('preserves indentation of the inserted static inject line', () => {
    const input = `  class Svc {
    constructor(@Inject(T) private t: T) {}
  }`
    const out = rewriteInjectToStatic(input)
    // The static inject line should be indented at constructor level
    expect(out).toMatch(/^\s+static inject/m)
  })
})
