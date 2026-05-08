import { describe, expect, test } from 'bun:test'
import { printSchema } from 'graphql'
import {
  createUnionType,
  Directive,
  Extensions,
  Field,
  InterfaceType,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from '../src'
import {
  DIRECTIVE_METADATA,
  EXTENSIONS_METADATA,
  INTERFACE_TYPE_METADATA,
} from '../src/metadata-keys'
import { SchemaBuilder } from '../src/schema-builder'

// ---------------------------------------------------------------------------
// @Directive
// ---------------------------------------------------------------------------
describe('@Directive', () => {
  test('writes directive metadata to Symbol.metadata on a class', () => {
    @ObjectType()
    @Directive('@deprecated(reason: "Use NewCat instead")')
    class OldCat {
      @Field(() => String)
      name!: string
    }

    const meta = OldCat[Symbol.metadata] as Record<symbol, unknown>
    const directives = meta[DIRECTIVE_METADATA] as string[]
    expect(directives).toContain('@deprecated(reason: "Use NewCat instead")')
  })

  test('accumulates multiple directives', () => {
    @ObjectType()
    @Directive('@auth')
    @Directive('@cacheControl(maxAge: 60)')
    class SecuredType {
      @Field(() => String)
      secret!: string
    }

    const meta = SecuredType[Symbol.metadata] as Record<symbol, unknown>
    const directives = meta[DIRECTIVE_METADATA] as string[]
    expect(directives).toContain('@auth')
    expect(directives).toContain('@cacheControl(maxAge: 60)')
  })
})

// ---------------------------------------------------------------------------
// @Extensions
// ---------------------------------------------------------------------------
describe('@Extensions', () => {
  test('writes extensions metadata to Symbol.metadata', () => {
    @ObjectType()
    @Extensions({ role: 'admin', cacheTtl: 30 })
    class AdminType {
      @Field(() => String)
      secret!: string
    }

    const meta = AdminType[Symbol.metadata] as Record<symbol, unknown>
    const exts = meta[EXTENSIONS_METADATA] as Record<string, unknown>
    expect(exts.role).toBe('admin')
    expect(exts.cacheTtl).toBe(30)
  })

  test('merges multiple @Extensions calls', () => {
    @ObjectType()
    @Extensions({ a: 1 })
    @Extensions({ b: 2 })
    class MultiExtType {
      @Field(() => String)
      data!: string
    }

    const meta = MultiExtType[Symbol.metadata] as Record<symbol, unknown>
    const exts = meta[EXTENSIONS_METADATA] as Record<string, unknown>
    expect(exts.a).toBe(1)
    expect(exts.b).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// @InterfaceType in schema
// ---------------------------------------------------------------------------
describe('@InterfaceType in schema', () => {
  test('builds schema with interface type', () => {
    @InterfaceType({ description: 'Any entity with an id' })
    class NodeInterface {
      @Field(() => String)
      id!: string
    }

    @ObjectType()
    class CatNode {
      @Field(() => String)
      id!: string

      @Field(() => String)
      name!: string
    }

    @Resolver()
    class NodeResolver {
      @Query(() => [CatNode])
      nodes() {
        return []
      }
    }

    const instances = new Map([[NodeResolver, new NodeResolver()]])
    const schema = new SchemaBuilder().build([NodeResolver], instances)
    const sdl = printSchema(schema)

    expect(sdl).toContain('type CatNode')
    expect(sdl).toContain('id: String!')
    expect(sdl).toContain('name: String!')

    // Interface metadata is registered correctly
    const meta = NodeInterface[Symbol.metadata] as Record<symbol, unknown>
    const ifaceMeta = meta[INTERFACE_TYPE_METADATA] as Record<string, unknown>
    expect(ifaceMeta.kind).toBe('interface')
  })
})

// ---------------------------------------------------------------------------
// Union types in schema
// ---------------------------------------------------------------------------
describe('Union types in schema', () => {
  test('registers and builds union type', () => {
    @ObjectType()
    class Truck {
      @Field(() => String)
      brand!: string
    }

    @ObjectType()
    class Boat {
      @Field(() => String)
      hullType!: string
    }

    const Vehicle = createUnionType({
      name: 'Vehicle',
      types: () => [Truck, Boat],
      resolveType: (value) => {
        if (typeof value === 'object' && value !== null && 'brand' in value)
          return 'Truck'
        return 'Boat'
      },
    })

    @Resolver()
    class VehicleResolver {
      @Query(() => Vehicle)
      vehicle(): Truck | Boat {
        return { brand: 'Ford' }
      }
    }

    const instances = new Map([[VehicleResolver, new VehicleResolver()]])
    const schema = new SchemaBuilder().build([VehicleResolver], instances)
    const sdl = printSchema(schema)

    expect(sdl).toContain('union Vehicle = Truck | Boat')
  })
})

// ---------------------------------------------------------------------------
// Enum types in schema
// ---------------------------------------------------------------------------
describe('Enum types in schema', () => {
  test('registers and builds enum type', () => {
    enum Priority {
      LOW = 'LOW',
      MEDIUM = 'MEDIUM',
      HIGH = 'HIGH',
    }
    registerEnumType(Priority, {
      name: 'Priority',
      description: 'Task priority level',
    })

    @ObjectType()
    class Task {
      @Field(() => String)
      title!: string

      @Field(() => Priority)
      priority!: Priority
    }

    @Resolver()
    class TaskResolver {
      @Query(() => [Task])
      tasks() {
        return []
      }
    }

    const instances = new Map([[TaskResolver, new TaskResolver()]])
    const schema = new SchemaBuilder().build([TaskResolver], instances)
    const sdl = printSchema(schema)

    expect(sdl).toContain('enum Priority')
    expect(sdl).toContain('LOW')
    expect(sdl).toContain('MEDIUM')
    expect(sdl).toContain('HIGH')
    expect(sdl).toContain('"Task priority level"')
  })
})
