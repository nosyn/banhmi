import { test, expect } from 'bun:test'
import { resolveExamplePath } from './code-from-example'

test('resolveExamplePath maps slug to examples/features path', () => {
  expect(resolveExamplePath('middleware-fn')).toBe(
    '/examples/features/middleware-fn/index.ts',
  )
})
