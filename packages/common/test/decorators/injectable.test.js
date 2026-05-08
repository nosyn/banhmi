import { describe, expect, test } from 'bun:test'
import { Injectable } from '../../src/decorators/injectable'
import { INJECTABLE_WATERMARK } from '../../src/metadata-keys'

describe('@Injectable', () => {
  test('marks a class as injectable', () => {
    @Injectable()
    class TestService {}
    const meta = TestService[Symbol.metadata]
    expect(meta?.[INJECTABLE_WATERMARK]).toBe(true)
  })
  test('unmarked class has no injectable metadata', () => {
    class PlainClass {}
    const meta = PlainClass[Symbol.metadata]
    expect(meta?.[INJECTABLE_WATERMARK]).toBeUndefined()
  })
})
