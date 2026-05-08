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
