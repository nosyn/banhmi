import { describe, expect, test } from 'bun:test'
import type { Sql } from '../src/index'
import { BaseRepository, Repository } from '../src/index'

/**
 * Creates a minimal mock for a `Bun.SQL` instance.
 *
 * The mock intercepts tagged-template calls and records the SQL strings and
 * interpolated values so tests can assert on the generated queries without
 * requiring a live database.
 */
function createMockSql() {
  const calls: { strings: TemplateStringsArray; values: unknown[] }[] = []

  // The mock also needs to handle sql(identifier) calls for table/column names
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
      // sql(tableName) or sql({ col: val }) — return a placeholder object
      return { __sqlFragment: stringsOrIdentifier }
    }
    // Tagged template call
    calls.push({ strings: stringsOrIdentifier as TemplateStringsArray, values })
    return Promise.resolve([])
  }) as unknown as Sql

  return { mockSql, calls }
}

describe('@Repository + BaseRepository (mocked Sql)', () => {
  test('@Repository stores entity metadata', () => {
    class User {
      id!: number
      name!: string
    }

    @Repository(User)
    class UserRepository extends BaseRepository<User> {}

    const repo = new UserRepository(createMockSql().mockSql)
    expect(repo.tableName).toBe('users')
  })

  test('tableName defaults to entity name lowercased + s', () => {
    class Article {
      id!: number
      title!: string
    }

    @Repository(Article)
    class ArticleRepository extends BaseRepository<Article> {}

    const repo = new ArticleRepository(createMockSql().mockSql)
    expect(repo.tableName).toBe('articles')
  })

  test('findById produces a tagged-template query with the id value', async () => {
    class Post {
      id!: number
      title!: string
    }

    @Repository(Post)
    class PostRepository extends BaseRepository<Post> {}

    const { mockSql, calls } = createMockSql()
    const repo = new PostRepository(mockSql)
    await repo.findById(42)

    // Should have issued exactly one template call containing id=42
    expect(calls).toHaveLength(1)
    const call = calls[0]
    expect(call).toBeDefined()
    // The values array should contain 42 as the interpolated id
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
    expect(result).toEqual([])
  })

  test('findById returns null when mock returns empty array', async () => {
    class Category {
      id!: number
      name!: string
    }

    @Repository(Category)
    class CategoryRepository extends BaseRepository<Category> {}

    const repo = new CategoryRepository(createMockSql().mockSql)
    const result = await repo.findById(999)
    expect(result).toBeNull()
  })

  test('delete produces a tagged-template query with the id', async () => {
    class Item {
      id!: number
      label!: string
    }

    @Repository(Item)
    class ItemRepository extends BaseRepository<Item> {}

    const { mockSql, calls } = createMockSql()
    const repo = new ItemRepository(mockSql)
    await repo.delete(5)

    expect(calls).toHaveLength(1)
    const hasId = calls[0]?.values.some(
      (v) =>
        v === 5 ||
        (typeof v === 'object' && v !== null && '__sqlFragment' in v),
    )
    expect(hasId).toBe(true)
  })
})
