import { describe, expect, test } from 'bun:test'
import {
  calculateQueryComplexity,
  createComplexityValidator,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from '../src'
import { SchemaBuilder } from '../src/schema-builder'

function buildTestSchema() {
  @ObjectType()
  class ComplexCat {
    @Field(() => String)
    id!: string

    @Field(() => String)
    name!: string

    @Field(() => Int, { nullable: true })
    age?: number
  }

  @Resolver()
  class ComplexResolver {
    @Query(() => [ComplexCat])
    cats() {
      return []
    }

    @Query(() => ComplexCat, { nullable: true })
    cat() {
      return null
    }
  }

  const instances = new Map([[ComplexResolver, new ComplexResolver()]])
  return new SchemaBuilder().build([ComplexResolver], instances)
}

// ---------------------------------------------------------------------------
// calculateQueryComplexity
// ---------------------------------------------------------------------------
describe('calculateQueryComplexity', () => {
  test('returns a complexity value for a simple query', () => {
    const schema = buildTestSchema()
    const result = calculateQueryComplexity('{ cats { id name } }', schema)
    expect(result.complexity).toBeGreaterThan(0)
    expect(result.max).toBe(1000)
  })

  test('exceeded is false for a simple query under default limit', () => {
    const schema = buildTestSchema()
    const result = calculateQueryComplexity('{ cats { id } }', schema, {
      maxComplexity: 1000,
    })
    expect(result.exceeded).toBe(false)
  })

  test('exceeded is true when complexity exceeds max', () => {
    const schema = buildTestSchema()
    const result = calculateQueryComplexity(
      '{ cats { id name age } }',
      schema,
      {
        maxComplexity: 1, // very low limit
      },
    )
    expect(result.exceeded).toBe(true)
  })

  test('uses custom defaultFieldComplexity', () => {
    const schema = buildTestSchema()
    const defaultResult = calculateQueryComplexity('{ cat { id } }', schema, {
      defaultFieldComplexity: 1,
    })
    const costlyResult = calculateQueryComplexity('{ cat { id } }', schema, {
      defaultFieldComplexity: 10,
    })
    expect(costlyResult.complexity).toBeGreaterThan(defaultResult.complexity)
  })
})

// ---------------------------------------------------------------------------
// createComplexityValidator
// ---------------------------------------------------------------------------
describe('createComplexityValidator', () => {
  test('does not throw for valid complexity', () => {
    const schema = buildTestSchema()
    const validate = createComplexityValidator(schema, { maxComplexity: 100 })
    expect(() => validate('{ cats { id } }')).not.toThrow()
  })

  test('throws for queries exceeding limit', () => {
    const schema = buildTestSchema()
    const validate = createComplexityValidator(schema, { maxComplexity: 1 })
    expect(() => validate('{ cats { id name age } }')).toThrow(
      /exceeds the maximum/,
    )
  })
})
