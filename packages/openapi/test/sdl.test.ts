import { describe, expect, test } from 'bun:test'
import { ApiProperty } from '../src/decorators'
import { generateSdl } from '../src/sdl'

describe('generateSdl', () => {
  test('generates SDL for a class with string and number properties', () => {
    class User {
      @ApiProperty({ type: 'string' })
      name: string = ''

      @ApiProperty({ type: 'number', format: 'int' })
      id: number = 0
    }

    const sdl = generateSdl([User])
    expect(sdl).toContain('type User {')
    expect(sdl).toContain('name: String!')
    expect(sdl).toContain('id: Int!')
  })

  test('maps number without int format to Float', () => {
    class Product {
      @ApiProperty({ type: 'number' })
      price: number = 0
    }

    const sdl = generateSdl([Product])
    expect(sdl).toContain('price: Float!')
  })

  test('maps boolean to Boolean', () => {
    class Flag {
      @ApiProperty({ type: 'boolean' })
      enabled: boolean = false
    }

    const sdl = generateSdl([Flag])
    expect(sdl).toContain('enabled: Boolean!')
  })

  test('handles required: false (no exclamation mark)', () => {
    class Cat {
      @ApiProperty({ type: 'string', required: false })
      nickname?: string
    }

    const sdl = generateSdl([Cat])
    expect(sdl).toContain('nickname: String')
    expect(sdl).not.toContain('nickname: String!')
  })

  test('handles array type producing [Type!]', () => {
    class Post {
      @ApiProperty({ type: ['string'] })
      tags: string[] = []
    }

    const sdl = generateSdl([Post])
    expect(sdl).toContain('tags: [String!]!')
  })

  test('handles nested class reference', () => {
    class Author {
      @ApiProperty({ type: 'string' })
      name: string = ''
    }

    class Article {
      @ApiProperty({ type: Author })
      author: Author = new Author()
    }

    const sdl = generateSdl([Author, Article])
    expect(sdl).toContain('type Author {')
    expect(sdl).toContain('type Article {')
    expect(sdl).toContain('author: Author!')
  })

  test('returns empty string for empty model list', () => {
    const sdl = generateSdl([])
    expect(sdl).toBe('')
  })

  test('skips models with no @ApiProperty decorators', () => {
    class Bare {
      name: string = ''
    }

    const sdl = generateSdl([Bare])
    expect(sdl).toBe('')
  })

  test('produces multiple types separated by blank line', () => {
    class A {
      @ApiProperty({ type: 'string' })
      x: string = ''
    }

    class B {
      @ApiProperty({ type: 'number' })
      y: number = 0
    }

    const sdl = generateSdl([A, B])
    expect(sdl).toContain('type A {')
    expect(sdl).toContain('type B {')
    expect(sdl.indexOf('type A {')).toBeLessThan(sdl.indexOf('type B {'))
  })
})
