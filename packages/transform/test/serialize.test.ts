import { describe, expect, test } from 'bun:test'
import {
  deserialize,
  Exclude,
  Expose,
  serialize,
  Transform,
  Type,
} from '../src/index'

// ─── DTOs used across tests ───────────────────────────────────────────────────

class AddressDto {
  city = ''
  country = ''
}

class TagDto {
  name = ''
}

class UserDto {
  name = ''

  @Exclude()
  password = ''

  @Expose({ name: 'user_id' })
  id = 0

  @Expose({ groups: ['admin'] })
  email = ''

  @Transform((v) => (v as string).toUpperCase())
  role = ''

  @Type(() => AddressDto)
  address: AddressDto = new AddressDto()

  @Type(() => TagDto)
  tags: TagDto[] = []
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('serialize — basic', () => {
  test('a property with no decorators is preserved', () => {
    const input = { name: 'mochi' }
    const result = serialize(
      input,
      class Dto {
        name = ''
      },
      {},
    )
    expect((result as Record<string, unknown>).name).toBe('mochi')
  })

  test('@Exclude drops the field', () => {
    const user = {
      name: 'mochi',
      password: 'secret',
      id: 1,
      email: 'x@x.com',
      role: 'admin',
      address: { city: 'hanoi', country: 'vn' },
      tags: [],
    }
    const out = serialize(user, UserDto) as Record<string, unknown>
    expect(out).not.toHaveProperty('password')
  })

  test('@Expose({ name }) renames the output key', () => {
    const user = {
      name: 'mochi',
      password: 'secret',
      id: 42,
      email: 'x@x.com',
      role: 'admin',
      address: { city: 'hanoi', country: 'vn' },
      tags: [],
    }
    const out = serialize(user, UserDto) as Record<string, unknown>
    expect(out).toHaveProperty('user_id', 42)
    expect(out).not.toHaveProperty('id')
  })

  test('@Transform runs the function', () => {
    const user = {
      name: 'mochi',
      password: 'secret',
      id: 1,
      email: 'x@x.com',
      role: 'admin',
      address: { city: 'hanoi', country: 'vn' },
      tags: [],
    }
    const out = serialize(user, UserDto) as Record<string, unknown>
    expect(out.role).toBe('ADMIN')
  })
})

describe('serialize — @Type nested objects', () => {
  test('@Type(() => AddressDto) serializes nested object', () => {
    const user = {
      name: 'mochi',
      password: 'secret',
      id: 1,
      email: 'x@x.com',
      role: 'admin',
      address: { city: 'hanoi', country: 'vn' },
      tags: [],
    }
    const out = serialize(user, UserDto) as Record<string, unknown>
    expect(out.address).toEqual({ city: 'hanoi', country: 'vn' })
  })

  test('@Type(() => TagDto) serializes array of nested objects', () => {
    const user = {
      name: 'mochi',
      password: 'secret',
      id: 1,
      email: 'x@x.com',
      role: 'admin',
      address: { city: 'hanoi', country: 'vn' },
      tags: [{ name: 'cute' }, { name: 'fluffy' }],
    }
    const out = serialize(user, UserDto) as Record<string, unknown>
    expect(out.tags).toEqual([{ name: 'cute' }, { name: 'fluffy' }])
  })

  test('nested array of primitives passes through', () => {
    class WithNumbers {
      values: number[] = []
    }
    const input = { values: [1, 2, 3] }
    const out = serialize(input, WithNumbers) as Record<string, unknown>
    expect(out.values).toEqual([1, 2, 3])
  })
})

describe('serialize — groups', () => {
  test('@Expose({ groups: ["admin"] }) is excluded when no groups match', () => {
    const user = {
      name: 'mochi',
      password: 'secret',
      id: 1,
      email: 'x@x.com',
      role: 'admin',
      address: { city: 'hanoi', country: 'vn' },
      tags: [],
    }
    const out = serialize(user, UserDto) as Record<string, unknown>
    expect(out).not.toHaveProperty('email')
  })

  test('@Expose({ groups: ["admin"] }) is included when groups match', () => {
    const user = {
      name: 'mochi',
      password: 'secret',
      id: 1,
      email: 'x@x.com',
      role: 'admin',
      address: { city: 'hanoi', country: 'vn' },
      tags: [],
    }
    const out = serialize(user, UserDto, { groups: ['admin'] }) as Record<
      string,
      unknown
    >
    expect(out.email).toBe('x@x.com')
  })

  test('group-agnostic fields always included regardless of opts.groups', () => {
    const user = {
      name: 'mochi',
      password: 'secret',
      id: 1,
      email: 'x@x.com',
      role: 'admin',
      address: { city: 'hanoi', country: 'vn' },
      tags: [],
    }
    const out = serialize(user, UserDto, { groups: ['user'] }) as Record<
      string,
      unknown
    >
    expect(out.name).toBe('mochi')
    expect(out.role).toBe('ADMIN')
  })
})

describe('serialize — edge cases', () => {
  test('returns null for null input', () => {
    const result = serialize(null as unknown as UserDto, UserDto)
    expect(result).toBeNull()
  })

  test('multiple @Expose and @Exclude on the same class do not interfere', () => {
    class Config {
      host = ''

      @Exclude()
      secret = ''

      @Expose({ name: 'port_num' })
      port = 0
    }
    const input = { host: 'localhost', secret: 'abc', port: 3000 }
    const out = serialize(input, Config) as Record<string, unknown>
    expect(out.host).toBe('localhost')
    expect(out).not.toHaveProperty('secret')
    expect(out.port_num).toBe(3000)
  })
})

describe('deserialize', () => {
  test('copies plain object keys to a fresh instance', () => {
    const instance = deserialize({ name: 'mochi', id: 1 }, UserDto)
    expect(instance).toBeInstanceOf(UserDto)
    expect((instance as Record<string, unknown>).name).toBe('mochi')
  })

  test('returns a fresh instance for non-object input', () => {
    const instance = deserialize(null, UserDto)
    expect(instance).toBeInstanceOf(UserDto)
  })
})
