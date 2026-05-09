import { describe, expect, test } from 'bun:test'
import {
  classValidator,
  IsArray,
  IsObject,
  IsString,
  ValidateNested,
} from '../../src/class-validator'

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class AddressDto {
  @IsString()
  street!: string

  @IsString()
  city!: string
}

class CreateUserDto {
  @IsString()
  name!: string

  @ValidateNested(() => AddressDto)
  address!: AddressDto
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('@ValidateNested — single object', () => {
  const v = classValidator(CreateUserDto)

  test('accepts valid nested object', () => {
    const r = v.safeParse({
      name: 'Alice',
      address: { street: '123 Main St', city: 'Springfield' },
    })
    expect(r.ok).toBe(true)
  })

  test('reports error with parent path when nested field fails', () => {
    const r = v.safeParse({
      name: 'Alice',
      address: { street: 123, city: 'Springfield' },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const err = r.errors.find((e) => e.path.includes('street'))
      expect(err).toBeDefined()
      // path must include the parent 'address' AND child 'street'
      expect(err?.path).toContain('address')
      expect(err?.path).toContain('street')
    }
  })

  test('reports multiple nested errors', () => {
    const r = v.safeParse({
      name: 'Alice',
      address: { street: 99, city: 88 },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThanOrEqual(2)
    }
  })
})

// ─── Array of nested objects ──────────────────────────────────────────────────

class TagDto {
  @IsString()
  label!: string
}

class PostDto {
  @IsString()
  title!: string

  @IsArray()
  @ValidateNested(() => TagDto)
  tags!: TagDto[]
}

describe('@ValidateNested — array of nested objects', () => {
  const v = classValidator(PostDto)

  test('accepts valid array of nested objects', () => {
    const r = v.safeParse({
      title: 'My Post',
      tags: [{ label: 'ts' }, { label: 'bun' }],
    })
    expect(r.ok).toBe(true)
  })

  test('reports error with index in path for array elements', () => {
    const r = v.safeParse({
      title: 'My Post',
      tags: [{ label: 'ok' }, { label: 42 }],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      // path should include 'tags', index 1, and 'label'
      const err = r.errors.find(
        (e) =>
          e.path.includes('tags') &&
          e.path.includes(1) &&
          e.path.includes('label'),
      )
      expect(err).toBeDefined()
    }
  })

  test('accepts empty array', () => {
    expect(v.safeParse({ title: 'My Post', tags: [] }).ok).toBe(true)
  })
})

// ─── @IsObject ────────────────────────────────────────────────────────────────

describe('@IsObject', () => {
  class Dto {
    @IsObject()
    meta!: Record<string, unknown>
  }
  const v = classValidator(Dto)

  test('accepts plain object', () => {
    expect(v.safeParse({ meta: { key: 'val' } }).ok).toBe(true)
  })

  test('accepts empty object', () => {
    expect(v.safeParse({ meta: {} }).ok).toBe(true)
  })

  test('rejects array', () => {
    expect(v.safeParse({ meta: [] }).ok).toBe(false)
  })

  test('rejects null', () => {
    expect(v.safeParse({ meta: null }).ok).toBe(false)
  })

  test('rejects string', () => {
    expect(v.safeParse({ meta: 'string' }).ok).toBe(false)
  })
})
