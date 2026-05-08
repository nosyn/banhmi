import { expect, test } from 'bun:test'
import { findReflectMetadataImports } from './no-reflect'

test('flags `import "reflect-metadata"`', () => {
  const v = findReflectMetadataImports([
    { path: 'a.ts', source: "import 'reflect-metadata'" },
  ])
  expect(v).toHaveLength(1)
})
test('flags double-quoted bare import', () => {
  const v = findReflectMetadataImports([
    { path: 'a2.ts', source: 'import "reflect-metadata"' },
  ])
  expect(v).toHaveLength(1)
})
test('flags `from "reflect-metadata"`', () => {
  const v = findReflectMetadataImports([
    { path: 'b.ts', source: "import x from 'reflect-metadata'" },
  ])
  expect(v).toHaveLength(1)
})
test('flags `require("reflect-metadata")`', () => {
  const v = findReflectMetadataImports([
    { path: 'c.ts', source: "const x = require('reflect-metadata')" },
  ])
  expect(v).toHaveLength(1)
})
test('does not flag the substring in a // comment', () => {
  const v = findReflectMetadataImports([
    { path: 'd.ts', source: '// reflect-metadata is forbidden' },
  ])
  expect(v).toHaveLength(0)
})
test('does not flag the substring in a /* */ block comment', () => {
  const v = findReflectMetadataImports([
    { path: 'e.ts', source: "/* import 'reflect-metadata' */" },
  ])
  expect(v).toHaveLength(0)
})
test('reports correct line number for violation after a multi-line block comment', () => {
  const source = ['/*', ' * notes', ' */', "import 'reflect-metadata'"].join(
    '\n',
  )
  const v = findReflectMetadataImports([{ path: 'f.ts', source }])
  expect(v).toHaveLength(1)
  expect(v[0].line).toBe(4)
})
test('preserves line numbers across single-line comments', () => {
  const source = ['// header', '', "import 'reflect-metadata'"].join('\n')
  const v = findReflectMetadataImports([{ path: 'g.ts', source }])
  expect(v[0].line).toBe(3)
  expect(v[0].path).toBe('g.ts')
})
test('known limitation: `//` inside a string masks a real violation later on the line', () => {
  // Pinned: the scanner does not parse strings.
  const v = findReflectMetadataImports([
    { path: 'h.ts', source: "const u = 'http://x'; import 'reflect-metadata'" },
  ])
  expect(v).toHaveLength(0)
})
