import { describe, expect, test } from 'bun:test'
import { emitSdl, Field, ID, ObjectType, Query, Resolver } from '../src'
import { SchemaBuilder } from '../src/schema-builder'

describe('emitSdl', () => {
  test('returns the SDL string for the schema', () => {
    @ObjectType()
    class SdlBook {
      @Field(() => ID)
      isbn!: string

      @Field(() => String)
      title!: string
    }

    @Resolver()
    class SdlBookResolver {
      @Query(() => [SdlBook])
      books() {
        return []
      }
    }

    const instances = new Map([[SdlBookResolver, new SdlBookResolver()]])
    const schema = new SchemaBuilder().build([SdlBookResolver], instances)

    const sdl = emitSdl(schema)

    expect(sdl).toContain('type SdlBook')
    expect(sdl).toContain('isbn: ID!')
    expect(sdl).toContain('title: String!')
    expect(sdl).toContain('books: [SdlBook!]!')
  })

  test('SDL is a non-empty string', () => {
    @ObjectType()
    class SdlWidget {
      @Field(() => String)
      label!: string
    }

    @Resolver()
    class SdlWidgetResolver {
      @Query(() => SdlWidget)
      widget() {
        return { label: 'test' }
      }
    }

    const instances = new Map([[SdlWidgetResolver, new SdlWidgetResolver()]])
    const schema = new SchemaBuilder().build([SdlWidgetResolver], instances)

    const sdl = emitSdl(schema)
    expect(typeof sdl).toBe('string')
    expect(sdl.length).toBeGreaterThan(0)
  })
})
