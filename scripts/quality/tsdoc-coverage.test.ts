import { expect, test } from 'bun:test'
import { findUndocumentedExports } from './tsdoc-coverage'

test('flags exported function with no TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'a.ts', source: 'export function foo() {}' },
  ])
  expect(v).toHaveLength(1)
  expect(v[0].name).toBe('foo')
})

test('passes exported function with TSDoc above it', () => {
  const v = findUndocumentedExports([
    { path: 'b.ts', source: '/**\n * Says hi\n */\nexport function foo() {}' },
  ])
  expect(v).toHaveLength(0)
})

test('flags exported class with no TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'c.ts', source: 'export class Foo {}' },
  ])
  expect(v).toHaveLength(1)
})

test('passes exported class with TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'd.ts', source: '/** doc */\nexport class Foo {}' },
  ])
  expect(v).toHaveLength(0)
})

test('flags `export const X = ...` without TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'e.ts', source: 'export const Foo = 1' },
  ])
  expect(v).toHaveLength(1)
  expect(v[0].name).toBe('Foo')
})

test('passes `export const X` with TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'e2.ts', source: '/** the answer */\nexport const Foo = 42' },
  ])
  expect(v).toHaveLength(0)
})

test('does not flag `export type` (types may be doc-d at site of use)', () => {
  const v = findUndocumentedExports([
    { path: 'f.ts', source: 'export type Foo = string' },
  ])
  expect(v).toHaveLength(0)
})

test('does not flag re-exports `export { foo } from`', () => {
  const v = findUndocumentedExports([
    { path: 'g.ts', source: "export { foo } from './bar'" },
  ])
  expect(v).toHaveLength(0)
})

test('does not flag star re-exports `export * from`', () => {
  const v = findUndocumentedExports([
    { path: 'g2.ts', source: "export * from './bar'" },
  ])
  expect(v).toHaveLength(0)
})

test('treats blank lines between TSDoc and export as documented', () => {
  const v = findUndocumentedExports([
    { path: 'h.ts', source: '/** doc */\n\nexport function foo() {}' },
  ])
  expect(v).toHaveLength(0)
})

test('reports the right line number for the export', () => {
  const source = ['', '', 'export function foo() {}'].join('\n')
  const v = findUndocumentedExports([{ path: 'i.ts', source }])
  expect(v).toHaveLength(1)
  expect(v[0].line).toBe(3)
  expect(v[0].path).toBe('i.ts')
})
