import { describe, expect, mock, test } from 'bun:test'
import { MongoRepository, Repository } from '../src/repository'

/**
 * Creates a minimal mock for a MongoDB `Collection<T>`.
 *
 * Records all method calls so tests can assert on the queries issued without
 * requiring a live MongoDB server.
 */
function createMockCollection<T>() {
  const calls: {
    method: string
    args: unknown[]
  }[] = []

  const col = {
    findOne: mock((filter: unknown) => {
      calls.push({ method: 'findOne', args: [filter] })
      return Promise.resolve(null)
    }),
    find: mock((filter: unknown) => {
      calls.push({ method: 'find', args: [filter] })
      return {
        toArray: () => Promise.resolve([] as T[]),
      }
    }),
    insertOne: mock((doc: unknown) => {
      calls.push({ method: 'insertOne', args: [doc] })
      return Promise.resolve({ acknowledged: true, insertedId: 'mock-id' })
    }),
    updateOne: mock((filter: unknown, update: unknown) => {
      calls.push({ method: 'updateOne', args: [filter, update] })
      return Promise.resolve({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
      })
    }),
    deleteOne: mock((filter: unknown) => {
      calls.push({ method: 'deleteOne', args: [filter] })
      return Promise.resolve({ acknowledged: true, deletedCount: 1 })
    }),
  }

  const db = {
    collection: (_name: string) => col,
  }

  return { col, db, calls }
}

describe('@Repository + MongoRepository (mocked Collection)', () => {
  test('@Repository stores entity metadata and derives collection name', () => {
    class Cat {
      name!: string
    }

    @Repository(Cat)
    class CatRepository extends MongoRepository<Cat> {}

    const { db } = createMockCollection<Cat>()
    const repo = new CatRepository(db)
    expect(repo.collectionName).toBe('cat')
  })

  test('collectionName defaults to entity name lowercased', () => {
    class BlogPost {
      title!: string
    }

    @Repository(BlogPost)
    class BlogPostRepository extends MongoRepository<BlogPost> {}

    const { db } = createMockCollection<BlogPost>()
    const repo = new BlogPostRepository(db)
    expect(repo.collectionName).toBe('blogpost')
  })

  test('findOne calls collection.findOne with the filter', async () => {
    class User {
      name!: string
    }

    @Repository(User)
    class UserRepository extends MongoRepository<User> {}

    const { db, col } = createMockCollection<User>()
    const repo = new UserRepository(db)

    await repo.findOne({ name: 'Alice' })

    expect(col.findOne).toHaveBeenCalledTimes(1)
    expect(col.findOne.mock.calls[0]?.[0]).toEqual({ name: 'Alice' })
  })

  test('find calls collection.find with the filter', async () => {
    class Tag {
      label!: string
    }

    @Repository(Tag)
    class TagRepository extends MongoRepository<Tag> {}

    const { db, col } = createMockCollection<Tag>()
    const repo = new TagRepository(db)

    const result = await repo.find({ label: 'news' })

    expect(col.find).toHaveBeenCalledTimes(1)
    expect(col.find.mock.calls[0]?.[0]).toEqual({ label: 'news' })
    expect(Array.isArray(result)).toBe(true)
  })

  test('insertOne calls collection.insertOne with the doc', async () => {
    class Item {
      label!: string
    }

    @Repository(Item)
    class ItemRepository extends MongoRepository<Item> {}

    const { db, col } = createMockCollection<Item>()
    const repo = new ItemRepository(db)

    await repo.insertOne({ label: 'hello' })

    expect(col.insertOne).toHaveBeenCalledTimes(1)
    expect(col.insertOne.mock.calls[0]?.[0]).toEqual({ label: 'hello' })
  })

  test('updateOne calls collection.updateOne with filter and update', async () => {
    class Post {
      title!: string
    }

    @Repository(Post)
    class PostRepository extends MongoRepository<Post> {}

    const { db, col } = createMockCollection<Post>()
    const repo = new PostRepository(db)

    await repo.updateOne({ title: 'old' }, { $set: { title: 'new' } })

    expect(col.updateOne).toHaveBeenCalledTimes(1)
    expect(col.updateOne.mock.calls[0]?.[0]).toEqual({ title: 'old' })
    expect(col.updateOne.mock.calls[0]?.[1]).toEqual({ $set: { title: 'new' } })
  })

  test('deleteOne calls collection.deleteOne with the filter', async () => {
    class Comment {
      body!: string
    }

    @Repository(Comment)
    class CommentRepository extends MongoRepository<Comment> {}

    const { db, col } = createMockCollection<Comment>()
    const repo = new CommentRepository(db)

    await repo.deleteOne({ body: 'spam' })

    expect(col.deleteOne).toHaveBeenCalledTimes(1)
    expect(col.deleteOne.mock.calls[0]?.[0]).toEqual({ body: 'spam' })
  })

  test('findOne returns null when collection returns null', async () => {
    class Article {
      title!: string
    }

    @Repository(Article)
    class ArticleRepository extends MongoRepository<Article> {}

    const { db } = createMockCollection<Article>()
    const repo = new ArticleRepository(db)

    const result = await repo.findOne({ title: 'does-not-exist' })
    expect(result).toBeNull()
  })

  test('find returns empty array when collection returns none', async () => {
    class Topic {
      name!: string
    }

    @Repository(Topic)
    class TopicRepository extends MongoRepository<Topic> {}

    const { db } = createMockCollection<Topic>()
    const repo = new TopicRepository(db)

    const result = await repo.find({})
    expect(result).toEqual([])
  })
})
