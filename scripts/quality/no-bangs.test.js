import { expect, test } from 'bun:test'
import { findBangUsages } from './no-bangs'

test('flags `foo!.bar`', () => {
  const violations = findBangUsages([{ path: 'a.ts', source: 'foo!.bar' }])
  expect(violations).toHaveLength(1)
})
test('flags `foo!()`', () => {
  const violations = findBangUsages([{ path: 'b.ts', source: 'foo!()' }])
  expect(violations).toHaveLength(1)
})
test('flags `foo![idx]`', () => {
  const violations = findBangUsages([{ path: 'c.ts', source: 'foo![idx]' }])
  expect(violations).toHaveLength(1)
})
test('flags `getThing()!.baz`', () => {
  const violations = findBangUsages([
    { path: 'd.ts', source: 'getThing()!.baz' },
  ])
  expect(violations).toHaveLength(1)
})
test('does not flag `!=`', () => {
  const violations = findBangUsages([{ path: 'e.ts', source: 'a != b' }])
  expect(violations).toHaveLength(0)
})
test('does not flag `!==`', () => {
  const violations = findBangUsages([{ path: 'f.ts', source: 'a !== b' }])
  expect(violations).toHaveLength(0)
})
test('does not flag `!foo`', () => {
  const violations = findBangUsages([{ path: 'g.ts', source: 'if (!foo)' }])
  expect(violations).toHaveLength(0)
})
test('ignores comments', () => {
  const violations = findBangUsages([{ path: 'h.ts', source: '// foo!.bar' }])
  expect(violations).toHaveLength(0)
})
test('reports correct line number for violation after a multi-line block comment', () => {
  const source = ['/*', ' * doc', ' */', 'const x = foo!.bar'].join('\n')
  const violations = findBangUsages([{ path: 'i.ts', source }])
  expect(violations).toHaveLength(1)
  expect(violations[0].line).toBe(4)
})
test('preserves line numbers across single-line comments', () => {
  const source = ['// header', '', 'const x = foo!.bar'].join('\n')
  const violations = findBangUsages([{ path: 'j.ts', source }])
  expect(violations[0].line).toBe(3)
  expect(violations[0].path).toBe('j.ts')
})
test('known limitation: `//` inside a string masks a real violation later on the line', () => {
  // Pinned: the scanner does not parse strings. `//` inside a string literal is treated as a comment.
  const violations = findBangUsages([
    { path: 'k.ts', source: "const u = 'http://x'; const v = foo!.bar" },
  ])
  expect(violations).toHaveLength(0)
})
