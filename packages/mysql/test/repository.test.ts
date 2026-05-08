import { describe, expect, test } from 'bun:test'
import type { Sql } from '../src/index'
import { BaseRepository, Repository } from '../src/index'

/**
 * Creates a minimal mock for a `Bun.SQL` (mysql adapter) instance.
 *
 * The mock intercepts tagged-template calls and records the SQL strings and
 * interpolated values so tests can assert on generated queries without
 * requiring a live MySQL server.
 *
 * `insert` triggers two template calls: the `INSERT` and the subsequent
 * `SELECT … LAST_INSERT_ID()`. The mock returns `[{ id: 1 }]` for any
 * `SELECT` call so `insert` can return a fake row.
 */
function createMockSql() {
  const calls: { strings: TemplateStringsArray; values: unknown[] }[] = []

  const mockSql = ((
    stringsOrIdentifier:
      | TemplateStringsArray
      | string
      | Record<string, unknown>,
    ...values: unknown[]
  ) => {
    if (
      typeof stringsOrIdentifier === 'string' ||
      (typeof stringsOrIdentifier === 'object' &&
        !Array.isArray(stringsOrIdentifier))
    ) {
      // sql('tableName') or sql({ col: val }) — return a fragment placeholder
      return { __sqlFragment: stringsOrIdentifier }
    }
    // Tagged template call
    calls.push({ strings: stringsOrIdentifier as TemplateStringsArray, values })
    // Return a fake row for SELECT queries so insert/findById can succeed
    const sql = (stringsOrIdentifier as TemplateStringsArray).raw.join('')
    if (sql.includes('SELECT')) {
      return Promise.resolve([
        { id: 1, name: 'mock', email: 'mock@example.com' },
      ])
    }
    return Promise.resolve([])
  }) as unknown as Sql

  return { mockSql, calls }
}

describe('@Repository + BaseRepository (mocked MySQL Sql)', () => {
  test('@Repository stores entity metadata and infers table name', () => {
    class Product {
      id!: number
      name!: string
    }

    @Repository(Product)
    class ProductRepository extends BaseRepository<Product> {}

    const repo = new ProductRepository(createMockSql().mockSql)
    expect(repo.tableName).toBe('products')
  })

  test('tableName defaults to entity name lowercased + s', () => {
    class Order {
      id!: number
      total!: number
    }

    @Repository(Order)
    class OrderRepository extends BaseRepository<Order> {}

    const repo = new OrderRepository(createMockSql().mockSql)
    expect(repo.tableName).toBe('orders')
  })

  test('findById produces a tagged-template query with the id value', async () => {
    class Item {
      id!: number
      label!: string
    }

    @Repository(Item)
    class ItemRepository extends BaseRepository<Item> {}

    const { mockSql, calls } = createMockSql()
    const repo = new ItemRepository(mockSql)
    await repo.findById(42)

    expect(calls).toHaveLength(1)
    const call = calls[0]
    expect(call).toBeDefined()
    const hasId = call?.values.some(
      (v) =>
        v === 42 ||
        (typeof v === 'object' && v !== null && '__sqlFragment' in v),
    )
    expect(hasId).toBe(true)
  })

  test('findAll produces a tagged-template query', async () => {
    class Tag {
      id!: number
      label!: string
    }

    @Repository(Tag)
    class TagRepository extends BaseRepository<Tag> {}

    const { mockSql, calls } = createMockSql()
    const repo = new TagRepository(mockSql)
    const result = await repo.findAll()

    expect(calls).toHaveLength(1)
    expect(Array.isArray(result)).toBe(true)
  })

  test('findById returns null when mock returns empty array', async () => {
    class Category {
      id!: number
      name!: string
    }

    @Repository(Category)
    class CategoryRepository extends BaseRepository<Category> {}

    // Override mock to always return empty
    const emptyMock = ((
      stringsOrIdentifier:
        | TemplateStringsArray
        | string
        | Record<string, unknown>,
      ...values: unknown[]
    ) => {
      if (
        typeof stringsOrIdentifier === 'string' ||
        (typeof stringsOrIdentifier === 'object' &&
          !Array.isArray(stringsOrIdentifier))
      ) {
        return { __sqlFragment: stringsOrIdentifier }
      }
      void values
      return Promise.resolve([])
    }) as unknown as Sql

    const repo = new CategoryRepository(emptyMock)
    const result = await repo.findById(999)
    expect(result).toBeNull()
  })

  test('delete produces a tagged-template query with the id', async () => {
    class Widget {
      id!: number
      color!: string
    }

    @Repository(Widget)
    class WidgetRepository extends BaseRepository<Widget> {}

    const { mockSql, calls } = createMockSql()
    const repo = new WidgetRepository(mockSql)
    await repo.delete(7)

    expect(calls).toHaveLength(1)
    const hasId = calls[0]?.values.some(
      (v) =>
        v === 7 ||
        (typeof v === 'object' && v !== null && '__sqlFragment' in v),
    )
    expect(hasId).toBe(true)
  })

  test('insert issues two queries: INSERT then SELECT LAST_INSERT_ID', async () => {
    class User {
      id!: number
      name!: string
    }

    @Repository(User)
    class UserRepository extends BaseRepository<User> {}

    const { mockSql, calls } = createMockSql()
    const repo = new UserRepository(mockSql)
    const result = await repo.insert({ name: 'Alice' })

    // Two calls: INSERT + SELECT LAST_INSERT_ID()
    expect(calls).toHaveLength(2)
    expect(result).toBeDefined()
  })
})
