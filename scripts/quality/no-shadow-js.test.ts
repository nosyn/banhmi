import { expect, test } from 'bun:test'
import { findShadowJs } from './no-shadow-js'

test('flags a .js file that shadows a .ts source', () => {
  const violations = findShadowJs([
    'packages/common/src/index.ts',
    'packages/common/src/index.js',
  ])
  expect(violations).toHaveLength(1)
  expect(violations[0].path).toBe('packages/common/src/index.js')
  expect(violations[0].reason).toBe('shadows packages/common/src/index.ts')
})

test('flags a .js file that shadows a .tsx source', () => {
  const violations = findShadowJs([
    'apps/docs/apps/web/src/components/hero.tsx',
    'apps/docs/apps/web/src/components/hero.js',
  ])
  expect(violations).toHaveLength(1)
  expect(violations[0].path).toBe(
    'apps/docs/apps/web/src/components/hero.js',
  )
  expect(violations[0].reason).toBe(
    'shadows apps/docs/apps/web/src/components/hero.tsx',
  )
})

test('allows a standalone .js with no .ts neighbour', () => {
  const violations = findShadowJs([
    'examples/drizzle-api/drizzle.config.js',
    'packages/common/src/index.ts',
  ])
  // drizzle.config.js has no drizzle.config.ts in the list — must not be flagged
  expect(violations).toHaveLength(0)
})

test('flags a .d.ts file that shadows a .ts source', () => {
  const violations = findShadowJs([
    'packages/core/src/container.ts',
    'packages/core/src/container.d.ts',
  ])
  expect(violations).toHaveLength(1)
  expect(violations[0].path).toBe('packages/core/src/container.d.ts')
  expect(violations[0].reason).toBe(
    'shadows packages/core/src/container.ts',
  )
})

test('flags a .js.map file that shadows a .ts source', () => {
  const violations = findShadowJs([
    'packages/core/src/container.ts',
    'packages/core/src/container.js.map',
  ])
  expect(violations).toHaveLength(1)
  expect(violations[0].path).toBe('packages/core/src/container.js.map')
})

test('flags a .d.ts.map file that shadows a .ts source', () => {
  const violations = findShadowJs([
    'packages/core/src/container.ts',
    'packages/core/src/container.d.ts.map',
  ])
  expect(violations).toHaveLength(1)
  expect(violations[0].path).toBe('packages/core/src/container.d.ts.map')
})

test('returns no violations for a clean list of only .ts files', () => {
  const violations = findShadowJs([
    'packages/common/src/index.ts',
    'packages/core/src/container.ts',
    'packages/platform-bun/src/factory.ts',
  ])
  expect(violations).toHaveLength(0)
})

test('returns no violations for an empty list', () => {
  const violations = findShadowJs([])
  expect(violations).toHaveLength(0)
})
