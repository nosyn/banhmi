import { describe, expect, test } from 'bun:test'
import { printSchema } from 'graphql'
import {
  createUnionType,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from '../src/decorators'
import { SchemaBuilder } from '../src/schema-builder'

// ---------------------------------------------------------------------------
// Basic schema building
// ---------------------------------------------------------------------------
describe('SchemaBuilder — basic types', () => {
  test('builds a schema with a simple Query', () => {
    @ObjectType()
    class SimpleType {
      @Field(() => String)
      name!: string
    }

    @Resolver()
    class SimpleResolver {
      @Query(() => SimpleType)
      findSimple() {
        return { name: 'test' }
      }
    }

    const instances = new Map([[SimpleResolver, new SimpleResolver()]])
    const schema = new SchemaBuilder().build([SimpleResolver], instances)

    expect(schema).toBeDefined()
    const queryType = schema.getQueryType()
    expect(queryType).toBeDefined()
    expect(queryType?.getFields().findSimple).toBeDefined()
  })

  test('builds correct SDL for a decorated type', () => {
    @ObjectType({ description: 'A test cat' })
    class SdlCat {
      @Field(() => ID)
      id!: string

      @Field(() => String)
      name!: string

      @Field(() => Int, { nullable: true })
      age?: number
    }

    @Resolver(() => SdlCat)
    class SdlCatResolver {
      @Query(() => [SdlCat])
      cats() {
        return []
      }
    }

    const instances = new Map([[SdlCatResolver, new SdlCatResolver()]])
    const schema = new SchemaBuilder().build([SdlCatResolver], instances)
    const sdl = printSchema(schema)

    expect(sdl).toContain('type SdlCat')
    expect(sdl).toContain('id: ID!')
    expect(sdl).toContain('name: String!')
    expect(sdl).toContain('age: Int')
    expect(sdl).toContain('cats: [SdlCat!]!')
  })
})

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------
describe('SchemaBuilder — input types', () => {
  test('correctly maps @InputType() as GraphQLInputObjectType', () => {
    @InputType()
    class CreatePetInput {
      @Field(() => String)
      name!: string

      @Field(() => Int, { nullable: true })
      age?: number
    }

    @Resolver()
    class PetMutationResolver {
      @Mutation(() => String)
      createPet(_args: { input: CreatePetInput }) {
        return 'created'
      }
    }

    const instances = new Map([
      [PetMutationResolver, new PetMutationResolver()],
    ])
    const schema = new SchemaBuilder().build([PetMutationResolver], instances)
    const mutationType = schema.getMutationType()
    expect(mutationType).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------
describe('SchemaBuilder — enum types', () => {
  test('builds GraphQLEnumType from registerEnumType', () => {
    enum Season {
      SPRING = 'SPRING',
      SUMMER = 'SUMMER',
      FALL = 'FALL',
      WINTER = 'WINTER',
    }
    registerEnumType(Season, { name: 'Season' })

    @ObjectType()
    class WeatherReport {
      @Field(() => Season)
      season!: Season
    }

    @Resolver()
    class WeatherResolver {
      @Query(() => WeatherReport)
      currentWeather() {
        return { season: Season.SUMMER }
      }
    }

    const instances = new Map([[WeatherResolver, new WeatherResolver()]])
    const schema = new SchemaBuilder().build([WeatherResolver], instances)
    const sdl = printSchema(schema)
    expect(sdl).toContain('enum Season')
    expect(sdl).toContain('SPRING')
    expect(sdl).toContain('SUMMER')
  })
})

// ---------------------------------------------------------------------------
// Union types
// ---------------------------------------------------------------------------
describe('SchemaBuilder — union types', () => {
  test('builds GraphQLUnionType from createUnionType', () => {
    @ObjectType()
    class UnionCat {
      @Field(() => String)
      name!: string
    }

    @ObjectType()
    class UnionDog {
      @Field(() => String)
      breed!: string
    }

    const Animal = createUnionType({
      name: 'Animal',
      types: () => [UnionCat, UnionDog],
    })

    @Resolver()
    class AnimalResolver {
      @Query(() => Animal)
      animal(): UnionCat | UnionDog {
        return new UnionCat()
      }
    }

    const instances = new Map([[AnimalResolver, new AnimalResolver()]])
    const schema = new SchemaBuilder().build([AnimalResolver], instances)
    const sdl = printSchema(schema)
    expect(sdl).toContain('union Animal = UnionCat | UnionDog')
  })
})

// ---------------------------------------------------------------------------
// Resolver execution
// ---------------------------------------------------------------------------
describe('SchemaBuilder — resolver execution', () => {
  test('resolves a simple query', async () => {
    const { graphql } = await import('graphql')

    @ObjectType()
    class Greeting {
      @Field(() => String)
      message!: string
    }

    @Resolver()
    class GreetingResolver {
      @Query(() => Greeting)
      greet() {
        return { message: 'Hello World' }
      }
    }

    const instances = new Map([[GreetingResolver, new GreetingResolver()]])
    const schema = new SchemaBuilder().build([GreetingResolver], instances)

    const result = await graphql({ schema, source: '{ greet { message } }' })
    expect(result.errors).toBeUndefined()
    expect((result.data as Record<string, unknown>).greet).toEqual({
      message: 'Hello World',
    })
  })

  test('resolves a mutation', async () => {
    const { graphql } = await import('graphql')

    @ObjectType()
    class MutResult {
      @Field(() => String)
      id!: string
    }

    @Resolver()
    class MutTestResolver {
      @Query(() => String)
      ping() {
        return 'pong'
      }

      @Mutation(() => MutResult)
      createItem() {
        return { id: 'new-id-123' }
      }
    }

    const instances = new Map([[MutTestResolver, new MutTestResolver()]])
    const schema = new SchemaBuilder().build([MutTestResolver], instances)

    const result = await graphql({
      schema,
      source: 'mutation { createItem { id } }',
    })
    expect(result.errors).toBeUndefined()
    expect((result.data as Record<string, unknown>).createItem).toEqual({
      id: 'new-id-123',
    })
  })
})
