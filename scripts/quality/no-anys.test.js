import { expect, test } from 'bun:test'
import { findAnyUsages } from './no-anys'

test('flags `: any` in TS source', () => {
  const violations = findAnyUsages([
    { path: 'a.ts', source: 'function f(x: any): void {}' },
  ])
  expect(violations).toHaveLength(1)
  expect(violations[0].path).toBe('a.ts')
})
test('flags `<any>` cast', () => {
  const violations = findAnyUsages([
    { path: 'b.ts', source: 'const x = <any>foo' },
  ])
  expect(violations).toHaveLength(1)
})
test('flags `as any`', () => {
  const violations = findAnyUsages([
    { path: 'c.ts', source: 'const x = foo as any' },
  ])
  expect(violations).toHaveLength(1)
})
test('does not flag the literal substring `Cany` (word-boundary safe)', () => {
  const violations = findAnyUsages([{ path: 'd.ts', source: 'const Cany = 1' }])
  expect(violations).toHaveLength(0)
})
test('ignores comments', () => {
  const violations = findAnyUsages([
    { path: 'e.ts', source: '// this is any text' },
  ])
  expect(violations).toHaveLength(0)
})
test('reports correct line number for violation after a multi-line block comment', () => {
  const source = ['/*', ' * doc', ' */', 'const x: any = 1'].join('\n')
  const violations = findAnyUsages([{ path: 'a.ts', source }])
  expect(violations).toHaveLength(1)
  expect(violations[0].line).toBe(4)
})
test('preserves line numbers across single-line comments', () => {
  const source = ['// header', '', 'const x: any = 1'].join('\n')
  const violations = findAnyUsages([{ path: 'b.ts', source }])
  expect(violations[0].line).toBe(3)
  expect(violations[0].path).toBe('b.ts')
})
test('flags `: any` inside a string literal (known limitation, documented)', () => {
  // The script does not parse strings; `: any` substrings inside string
  // literals are treated as code. This test pins the current behaviour so
  // future regressions are obvious.
  const violations = findAnyUsages([
    { path: 'c.ts', source: "const msg = 'expected: any'" },
  ])
  expect(violations).toHaveLength(1)
})
test('known limitation: `//` inside a string masks a real violation later on the line', () => {
  // The scanner does not parse strings. A `//` inside a string literal is
  // treated as the start of a comment and erases the rest of the line,
  // which can hide a real `: any` after it. Pinned so a future fix is
  // detectable as a behaviour change.
  const violations = findAnyUsages([
    { path: 'a.ts', source: "const u = 'http://x'; const v: any = 1" },
  ])
  expect(violations).toHaveLength(0) // current (buggy) behaviour
})
