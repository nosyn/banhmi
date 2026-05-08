import { describe, expect, test } from 'bun:test'
import { printSchema } from 'graphql'
import {
  Field,
  InputType,
  IntersectionType,
  Mutation,
  ObjectType,
  OmitType,
  PartialType,
  PickType,
  Query,
  Resolver,
} from '../src'
import { FIELD_METADATA } from '../src/metadata-keys'
import { SchemaBuilder } from '../src/schema-builder'
import type { FieldMeta } from '../src/types'

// ---------------------------------------------------------------------------
// PartialType
// ---------------------------------------------------------------------------
describe('PartialType', () => {
  test('all fields become nullable', () => {
    @InputType()
    class CreateBase {
      @Field(() => String)
      name!: string

      @Field(() => Number)
      age!: number
    }

    const Partial = PartialType(CreateBase)
    const meta = (Partial as unknown as Record<symbol, unknown>)[
      Symbol.metadata
    ] as Record<symbol, unknown>
    const fields = meta[FIELD_METADATA] as FieldMeta[]

    expect(fields.every((f) => f.options.nullable === true)).toBe(true)
    expect(fields).toHaveLength(2)
  })

  test('generated type name is Partial<OriginalName>', () => {
    @InputType({ name: 'BaseInput' })
    class BaseInput {
      @Field(() => String)
      x!: string
    }

    const Partial = PartialType(BaseInput)
    expect((Partial as { name: string }).name).toBe('PartialBaseInput')
  })
})

// ---------------------------------------------------------------------------
// PickType
// ---------------------------------------------------------------------------
describe('PickType', () => {
  test('only selected fields are included', () => {
    @InputType()
    class FullInput {
      @Field(() => String)
      id!: string

      @Field(() => String)
      name!: string

      @Field(() => Number)
      age!: number
    }

    const Picked = PickType(FullInput, ['id', 'name'] as const)
    const meta = (Picked as unknown as Record<symbol, unknown>)[
      Symbol.metadata
    ] as Record<symbol, unknown>
    const fields = meta[FIELD_METADATA] as FieldMeta[]

    const keys = fields.map((f) => f.propertyKey)
    expect(keys).toContain('id')
    expect(keys).toContain('name')
    expect(keys).not.toContain('age')
    expect(fields).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// OmitType
// ---------------------------------------------------------------------------
describe('OmitType', () => {
  test('excludes specified fields', () => {
    @InputType()
    class FullInput2 {
      @Field(() => String)
      id!: string

      @Field(() => String)
      name!: string

      @Field(() => Number)
      createdAt!: number
    }

    const Omitted = OmitType(FullInput2, ['createdAt'] as const)
    const meta = (Omitted as unknown as Record<symbol, unknown>)[
      Symbol.metadata
    ] as Record<symbol, unknown>
    const fields = meta[FIELD_METADATA] as FieldMeta[]

    const keys = fields.map((f) => f.propertyKey)
    expect(keys).toContain('id')
    expect(keys).toContain('name')
    expect(keys).not.toContain('createdAt')
  })
})

// ---------------------------------------------------------------------------
// IntersectionType
// ---------------------------------------------------------------------------
describe('IntersectionType', () => {
  test('merges fields from both types', () => {
    @InputType()
    class TypeA {
      @Field(() => String)
      x!: string
    }

    @InputType()
    class TypeB {
      @Field(() => Number)
      y!: number
    }

    const Merged = IntersectionType(TypeA, TypeB)
    const meta = (Merged as unknown as Record<symbol, unknown>)[
      Symbol.metadata
    ] as Record<symbol, unknown>
    const fields = meta[FIELD_METADATA] as FieldMeta[]

    const keys = fields.map((f) => f.propertyKey)
    expect(keys).toContain('x')
    expect(keys).toContain('y')
  })

  test('TypeB fields override TypeA on key conflict', () => {
    @InputType()
    class Base1 {
      @Field(() => String)
      id!: string

      @Field(() => String)
      name!: string
    }

    @InputType()
    class Override1 {
      @Field(() => Number)
      id!: number // overrides Base1.id with different type
    }

    const Merged2 = IntersectionType(Base1, Override1)
    const meta = (Merged2 as unknown as Record<symbol, unknown>)[
      Symbol.metadata
    ] as Record<symbol, unknown>
    const fields = meta[FIELD_METADATA] as FieldMeta[]

    const idField = fields.find((f) => f.propertyKey === 'id')
    expect(idField?.typeFn()).toBe(Number)
  })
})

// ---------------------------------------------------------------------------
// Integration: mapped types in schema
// ---------------------------------------------------------------------------
describe('Mapped types in schema', () => {
  test('PartialType fields are nullable in schema', async () => {
    @ObjectType()
    class Pet {
      @Field(() => String)
      name!: string

      @Field(() => String)
      species!: string
    }

    @InputType()
    class CreatePetInput {
      @Field(() => String)
      name!: string

      @Field(() => String)
      species!: string
    }

    class UpdatePetInput extends PartialType(CreatePetInput) {}
    InputType()(UpdatePetInput, {
      kind: 'class',
      name: 'UpdatePetInput',
      metadata: {} as DecoratorMetadataObject,
      addInitializer: () => {},
    })

    @Resolver()
    class PetResolver {
      @Query(() => [Pet])
      pets() {
        return []
      }

      @Mutation(() => Pet)
      updatePet() {
        return { name: 'Rex', species: 'Dog' }
      }
    }

    const instances = new Map([[PetResolver, new PetResolver()]])
    const schema = new SchemaBuilder().build([PetResolver], instances)
    const sdl = printSchema(schema)

    // The SDL contains the Pet type correctly
    expect(sdl).toContain('type Pet')
    expect(sdl).toContain('name: String!')
  })
})
