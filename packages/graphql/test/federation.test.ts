import { describe, expect, test } from 'bun:test'
import { Field, ID, Key, ObjectType, Query, Resolver } from '../src'
import { FEDERATION_KEY_METADATA } from '../src/metadata-keys'
import { SchemaBuilder } from '../src/schema-builder'

// ---------------------------------------------------------------------------
// @Key decorator
// ---------------------------------------------------------------------------
describe('@Key decorator', () => {
  test('writes federation key metadata to Symbol.metadata', () => {
    @ObjectType()
    @Key('id')
    class UserEntity {
      @Field(() => ID)
      id!: string

      @Field(() => String)
      email!: string
    }

    const meta = UserEntity[Symbol.metadata] as Record<symbol, unknown>
    const keys = meta[FEDERATION_KEY_METADATA] as string[]
    expect(keys).toContain('id')
  })

  test('supports multiple @Key decorators', () => {
    @ObjectType()
    @Key('id')
    @Key('email')
    class MultiKeyEntity {
      @Field(() => ID)
      id!: string

      @Field(() => String)
      email!: string
    }

    const meta = MultiKeyEntity[Symbol.metadata] as Record<symbol, unknown>
    const keys = meta[FEDERATION_KEY_METADATA] as string[]
    expect(keys).toContain('id')
    expect(keys).toContain('email')
  })

  test('supports compound key fields', () => {
    @ObjectType()
    @Key('orgId userId')
    class OrgUser {
      @Field(() => ID)
      orgId!: string

      @Field(() => ID)
      userId!: string
    }

    const meta = OrgUser[Symbol.metadata] as Record<symbol, unknown>
    const keys = meta[FEDERATION_KEY_METADATA] as string[]
    expect(keys[0]).toBe('orgId userId')
  })
})

// ---------------------------------------------------------------------------
// buildFederationSubgraphSchema
// ---------------------------------------------------------------------------
describe('buildFederationSubgraphSchema', () => {
  test('builds a valid federation subgraph schema', async () => {
    const { buildFederationSubgraphSchema } = await import('../src/federation')

    @ObjectType()
    @Key('id')
    class ProductEntity {
      @Field(() => ID)
      id!: string

      @Field(() => String)
      name!: string
    }

    @Resolver()
    class ProductResolver {
      @Query(() => [ProductEntity])
      products() {
        return []
      }
    }

    const instances = new Map([[ProductResolver, new ProductResolver()]])
    const baseSchema = new SchemaBuilder().build([ProductResolver], instances)
    const { schema, sdl } = buildFederationSubgraphSchema(baseSchema, [
      ProductEntity,
    ])

    expect(schema).toBeDefined()
    expect(sdl).toContain('@key(fields: "id")')
    expect(sdl).toContain('type ProductEntity')
  })

  test('returns schema with federation service definition', async () => {
    const { buildFederationSubgraphSchema } = await import('../src/federation')

    @ObjectType()
    @Key('id')
    class OrderEntity {
      @Field(() => ID)
      id!: string

      @Field(() => String)
      status!: string
    }

    @Resolver()
    class OrderResolver {
      @Query(() => [OrderEntity])
      orders() {
        return []
      }
    }

    const instances = new Map([[OrderResolver, new OrderResolver()]])
    const baseSchema = new SchemaBuilder().build([OrderResolver], instances)
    const { schema } = buildFederationSubgraphSchema(baseSchema, [OrderEntity])

    // Federation subgraph schema should include _service type
    const types = schema.getTypeMap()
    expect(types._Service).toBeDefined()
  })
})
