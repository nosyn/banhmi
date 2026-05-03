import { describe, expect, test } from 'bun:test'
import { Injectable } from '../../src/decorators/injectable'
import { Module } from '../../src/decorators/module'
import { MODULE_METADATA } from '../../src/metadata-keys'

describe('@Module', () => {
  test('stores module metadata on the class', () => {
    @Injectable()
    class SomeService {}

    @Module({ providers: [SomeService] })
    class AppModule {}

    const meta = AppModule[Symbol.metadata] as Record<symbol, unknown> | null
    const moduleMeta = meta?.[MODULE_METADATA] as { providers: unknown[] } | undefined
    expect(moduleMeta?.providers).toContain(SomeService)
  })

  test('stores empty object when no metadata provided', () => {
    @Module({})
    class EmptyModule {}

    const meta = EmptyModule[Symbol.metadata] as Record<symbol, unknown> | null
    const moduleMeta = meta?.[MODULE_METADATA] as Record<string, unknown> | undefined
    expect(moduleMeta).toBeDefined()
  })
})
