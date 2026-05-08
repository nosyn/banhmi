import { describe, expect, test } from 'bun:test'
import { Controller } from '../../src/decorators/controller'
import { CONTROLLER_METADATA } from '../../src/metadata-keys'

describe('@Controller', () => {
  test('stores prefix on class metadata', () => {
    @Controller('/cats')
    class CatsController {}
    const meta = CatsController[Symbol.metadata]
    expect(meta?.[CONTROLLER_METADATA]).toEqual({ prefix: '/cats' })
  })
  test('defaults to empty prefix', () => {
    @Controller()
    class RootController {}
    const meta = RootController[Symbol.metadata]
    expect(meta?.[CONTROLLER_METADATA]).toEqual({ prefix: '' })
  })
})
