import { describe, expect, test } from 'bun:test'
import { transformSource } from '../src/transform'

describe('transformSource', () => {
  test('adds @ApiProperty() to a plain typed property', () => {
    const input = `class A {\n  name: string\n}`
    const result = transformSource(input)
    expect(result).toContain('@ApiProperty()')
    expect(result).toContain('name: string')
  })

  test('adds @ApiProperty() to an optional typed property', () => {
    const input = `class A {\n  age?: number\n}`
    const result = transformSource(input)
    expect(result).toContain('@ApiProperty()')
    expect(result).toContain('age?: number')
  })

  test('does not add decorator when @ApiProperty() already present', () => {
    const input = `class A {\n  @ApiProperty()\n  name: string\n}`
    const result = transformSource(input)
    // Should contain exactly one @ApiProperty
    const count = (result.match(/@ApiProperty/g) ?? []).length
    expect(count).toBe(1)
  })

  test('does not add decorator when @ApiHideProperty() already present', () => {
    const input = `class A {\n  @ApiHideProperty()\n  name: string\n}`
    const result = transformSource(input)
    expect(result).not.toContain('@ApiProperty()')
  })

  test('does not add decorator when @Exclude() already present', () => {
    const input = `class A {\n  @Exclude()\n  name: string\n}`
    const result = transformSource(input)
    expect(result).not.toContain('@ApiProperty()')
  })

  test('does not touch function declarations', () => {
    const input = `function foo() {\n  const x: string = ''\n}`
    const result = transformSource(input)
    expect(result).not.toContain('@ApiProperty()')
  })

  test('does not touch type aliases', () => {
    const input = `type Foo = { name: string }`
    const result = transformSource(input)
    expect(result).not.toContain('@ApiProperty()')
  })

  test('skips private keyword properties', () => {
    const input = `class A {\n  private secret: string = ''\n}`
    const result = transformSource(input)
    expect(result).not.toContain('@ApiProperty()')
  })

  test('skips static properties', () => {
    const input = `class A {\n  static count: number = 0\n}`
    const result = transformSource(input)
    expect(result).not.toContain('@ApiProperty()')
  })

  test('handles multiple properties in a class', () => {
    const input = `class Cat {\n  name: string = ''\n  age?: number\n  breed: string = ''\n}`
    const result = transformSource(input)
    const count = (result.match(/@ApiProperty\(\)/g) ?? []).length
    expect(count).toBe(3)
  })

  test('preserves indentation when injecting decorator', () => {
    const input = `class A {\n  name: string\n}`
    const result = transformSource(input)
    expect(result).toContain('  @ApiProperty()')
  })

  test('does not modify code without class keyword', () => {
    const input = `const x = { name: 'foo' }`
    const result = transformSource(input)
    expect(result).toBe(input)
  })
})
