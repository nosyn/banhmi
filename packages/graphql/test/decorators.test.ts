import { describe, expect, test } from 'bun:test'
import {
  createUnionType,
  Field,
  ID,
  InputType,
  Int,
  InterfaceType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from '../src/decorators'
import {
  FIELD_METADATA,
  INTERFACE_TYPE_METADATA,
  OBJECT_TYPE_METADATA,
  OPERATIONS_METADATA,
  RESOLVER_METADATA,
} from '../src/metadata-keys'
import type { FieldMeta, OperationMeta, ResolverMeta } from '../src/types'

// ---------------------------------------------------------------------------
// @ObjectType
// ---------------------------------------------------------------------------
describe('@ObjectType', () => {
  test('writes object-type metadata to Symbol.metadata', () => {
    @ObjectType({ description: 'A cat entity' })
    class Cat {}

    const meta = Cat[Symbol.metadata] as Record<symbol, unknown>
    const typeMeta = meta[OBJECT_TYPE_METADATA] as Record<string, unknown>
    expect(typeMeta).toBeDefined()
    expect(typeMeta.name).toBe('Cat')
    expect(typeMeta.description).toBe('A cat entity')
    expect(typeMeta.kind).toBe('object')
  })

  test('uses custom name when provided', () => {
    @ObjectType({ name: 'KittyType' })
    class Kitty {}

    const meta = Kitty[Symbol.metadata] as Record<symbol, unknown>
    const typeMeta = meta[OBJECT_TYPE_METADATA] as Record<string, unknown>
    expect(typeMeta.name).toBe('KittyType')
  })
})

// ---------------------------------------------------------------------------
// @InputType
// ---------------------------------------------------------------------------
describe('@InputType', () => {
  test('writes input-type metadata with kind="input"', () => {
    @InputType()
    class CreateCatInput {}

    const meta = CreateCatInput[Symbol.metadata] as Record<symbol, unknown>
    const typeMeta = meta[OBJECT_TYPE_METADATA] as Record<string, unknown>
    expect(typeMeta.kind).toBe('input')
    expect(typeMeta.name).toBe('CreateCatInput')
  })
})

// ---------------------------------------------------------------------------
// @InterfaceType
// ---------------------------------------------------------------------------
describe('@InterfaceType', () => {
  test('writes interface-type metadata', () => {
    @InterfaceType({ description: 'A node' })
    class Node {}

    const meta = Node[Symbol.metadata] as Record<symbol, unknown>
    const ifaceMeta = meta[INTERFACE_TYPE_METADATA] as Record<string, unknown>
    expect(ifaceMeta).toBeDefined()
    expect(ifaceMeta.kind).toBe('interface')
    expect(ifaceMeta.name).toBe('Node')
    expect(ifaceMeta.description).toBe('A node')
  })
})

// ---------------------------------------------------------------------------
// @Field
// ---------------------------------------------------------------------------
describe('@Field', () => {
  test('writes field metadata to Symbol.metadata', () => {
    class DogType {
      @Field(() => String)
      name!: string

      @Field(() => Int, { nullable: true })
      age?: number
    }

    const meta = DogType[Symbol.metadata] as Record<symbol, unknown>
    const fields = meta[FIELD_METADATA] as FieldMeta[]
    expect(fields).toHaveLength(2)

    const nameField = fields.find((f) => f.propertyKey === 'name')
    expect(nameField).toBeDefined()
    expect(nameField?.options.nullable).toBeUndefined()

    const ageField = fields.find((f) => f.propertyKey === 'age')
    expect(ageField?.options.nullable).toBe(true)
  })

  test('defaults to String type when no typeFn provided', () => {
    class BirdType {
      @Field()
      species!: string
    }

    const meta = BirdType[Symbol.metadata] as Record<symbol, unknown>
    const fields = meta[FIELD_METADATA] as FieldMeta[]
    expect(fields[0]?.typeFn()).toBe(String)
  })

  test('accumulates multiple fields', () => {
    class FishType {
      @Field(() => ID) id!: string
      @Field(() => String) color!: string
      @Field(() => Int) fins!: number
    }

    const meta = FishType[Symbol.metadata] as Record<symbol, unknown>
    const fields = meta[FIELD_METADATA] as FieldMeta[]
    expect(fields).toHaveLength(3)
    const keys = fields.map((f) => f.propertyKey)
    expect(keys).toContain('id')
    expect(keys).toContain('color')
    expect(keys).toContain('fins')
  })
})

// ---------------------------------------------------------------------------
// @Resolver / @Query / @Mutation
// ---------------------------------------------------------------------------
describe('@Resolver + @Query + @Mutation', () => {
  test('@Resolver writes resolver metadata', () => {
    @Resolver(() => class Cat {})
    class CatResolverTest {}

    const meta = CatResolverTest[Symbol.metadata] as Record<symbol, unknown>
    const resolverMeta = meta[RESOLVER_METADATA] as ResolverMeta
    expect(resolverMeta).toBeDefined()
    expect(resolverMeta.typeFn).toBeTypeOf('function')
  })

  test('@Query writes operation metadata with kind="query"', () => {
    class QueryTestResolver {
      @Query(() => String)
      hello() {
        return 'world'
      }
    }

    const meta = QueryTestResolver[Symbol.metadata] as Record<symbol, unknown>
    const ops = meta[OPERATIONS_METADATA] as OperationMeta[]
    expect(ops).toHaveLength(1)
    expect(ops[0]?.kind).toBe('query')
    expect(ops[0]?.methodKey).toBe('hello')
  })

  test('@Mutation writes operation metadata with kind="mutation"', () => {
    class MutationTestResolver {
      @Mutation(() => String)
      createThing() {
        return 'created'
      }
    }

    const meta = MutationTestResolver[Symbol.metadata] as Record<
      symbol,
      unknown
    >
    const ops = meta[OPERATIONS_METADATA] as OperationMeta[]
    expect(ops[0]?.kind).toBe('mutation')
  })

  test('multiple operations accumulate on metadata', () => {
    class MultiOpResolver {
      @Query(() => String)
      queryOne() {
        return '1'
      }

      @Query(() => Int)
      queryTwo() {
        return 2
      }

      @Mutation(() => String)
      mutateOne() {
        return 'mutated'
      }
    }

    const meta = MultiOpResolver[Symbol.metadata] as Record<symbol, unknown>
    const ops = meta[OPERATIONS_METADATA] as OperationMeta[]
    expect(ops).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// registerEnumType
// ---------------------------------------------------------------------------
describe('registerEnumType', () => {
  test('registers enum in the enum registry', async () => {
    const { enumRegistry } = await import('../src/decorators/enum-type')
    enum Status {
      ACTIVE = 'ACTIVE',
      INACTIVE = 'INACTIVE',
    }
    registerEnumType(Status, { name: 'Status' })
    expect(enumRegistry.has(Status)).toBe(true)
    expect(enumRegistry.get(Status)?.name).toBe('Status')
  })
})

// ---------------------------------------------------------------------------
// createUnionType
// ---------------------------------------------------------------------------
describe('createUnionType', () => {
  test('registers union and returns sentinel', async () => {
    const { unionRegistry } = await import('../src/decorators/union-type')

    @ObjectType()
    class CatForUnion {
      @Field(() => String) name!: string
    }

    @ObjectType()
    class DogForUnion {
      @Field(() => String) breed!: string
    }

    const PetUnion = createUnionType({
      name: 'PetUnion',
      types: () => [CatForUnion, DogForUnion],
    })

    expect(PetUnion.__unionName).toBe('PetUnion')
    expect(unionRegistry.has('PetUnion')).toBe(true)
  })
})
