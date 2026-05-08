import { Database } from 'bun:sqlite'
import { afterEach, describe, expect, test } from 'bun:test'
import { Injectable, Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import {
  BaseRepository,
  DATABASE_TOKEN,
  Repository,
  SqliteModule,
} from '../src/index'

describe('SqliteModule.forRoot', () => {
  let app = null
  afterEach(async () => {
    await app?.close()
    app = null
  })
  test('registers a Database instance as DATABASE_TOKEN', async () => {
    @Module({ imports: [SqliteModule.forRoot(':memory:')] })
    class AppModule {}
    app = await BanhmiFactory.create(AppModule)
    const db = app.container.resolve(DATABASE_TOKEN)
    expect(db).toBeInstanceOf(Database)
  })
  test('enables WAL mode by default (file-based db)', async () => {
    const tmpPath = `/tmp/banhmi-sqlite-wal-test-${Date.now()}.db`
    @Module({ imports: [SqliteModule.forRoot(tmpPath)] })
    class WalAppModule {}
    app = await BanhmiFactory.create(WalAppModule)
    const db = app.container.resolve(DATABASE_TOKEN)
    const result = db.query('PRAGMA journal_mode').get()
    expect(result?.journal_mode).toBe('wal')
    // cleanup
    await app.close()
    app = null
    try {
      require('node:fs').unlinkSync(tmpPath)
    } catch {
      /* ignore */
    }
    try {
      require('node:fs').unlinkSync(`${tmpPath}-wal`)
    } catch {
      /* ignore */
    }
    try {
      require('node:fs').unlinkSync(`${tmpPath}-shm`)
    } catch {
      /* ignore */
    }
  })
  test('injects Database into a service via DATABASE_TOKEN', async () => {
    @Injectable()
    class UserService {
      db
      static inject = [DATABASE_TOKEN]
      constructor(db) {
        this.db = db
      }
    }
    @Module({
      imports: [SqliteModule.forRoot(':memory:')],
      providers: [UserService],
    })
    class AppModule {}
    app = await BanhmiFactory.create(AppModule)
    const svc = app.container.resolve(UserService)
    expect(svc.db).toBeInstanceOf(Database)
  })
})
describe('@Repository + BaseRepository', () => {
  test('findAll returns typed rows', () => {
    class User {
      id
      name
    }
    @Repository(User)
    class UserRepository extends BaseRepository {
      tableName = 'users'
    }
    const db = new Database(':memory:')
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')
    db.exec("INSERT INTO users (name) VALUES ('Alice'), ('Bob')")
    const repo = new UserRepository(db)
    const users = repo.findAll()
    expect(users).toHaveLength(2)
    expect(users[0]).toBeInstanceOf(User)
    expect(users[0]?.name).toBe('Alice')
  })
  test('findById returns single typed row or null', () => {
    class Post {
      id
      title
    }
    @Repository(Post)
    class PostRepository extends BaseRepository {
      tableName = 'posts'
    }
    const db = new Database(':memory:')
    db.exec('CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL)')
    db.exec("INSERT INTO posts (title) VALUES ('Hello World')")
    const repo = new PostRepository(db)
    const post = repo.findById(1)
    expect(post).toBeInstanceOf(Post)
    expect(post?.title).toBe('Hello World')
    const missing = repo.findById(999)
    expect(missing).toBeNull()
  })
  test('save inserts a new row and returns the id', () => {
    class Tag {
      id
      label
    }
    @Repository(Tag)
    class TagRepository extends BaseRepository {
      tableName = 'tags'
    }
    const db = new Database(':memory:')
    db.exec('CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL)')
    const repo = new TagRepository(db)
    const id = repo.save({ label: 'bun' })
    expect(typeof id).toBe('number')
    const found = repo.findById(id)
    expect(found?.label).toBe('bun')
  })
  test('delete removes a row by id', () => {
    class Category {
      id
      name
    }
    @Repository(Category)
    class CategoryRepository extends BaseRepository {
      tableName = 'categories'
    }
    const db = new Database(':memory:')
    db.exec(
      'CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
    )
    db.exec("INSERT INTO categories (name) VALUES ('Test')")
    const repo = new CategoryRepository(db)
    repo.delete(1)
    expect(repo.findById(1)).toBeNull()
  })
  test('transaction commits on success', () => {
    class Item {
      id
      name
    }
    @Repository(Item)
    class ItemRepository extends BaseRepository {
      tableName = 'items'
    }
    const db = new Database(':memory:')
    db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')
    const repo = new ItemRepository(db)
    repo.transaction(() => {
      repo.save({ name: 'a' })
      repo.save({ name: 'b' })
    })
    expect(repo.findAll()).toHaveLength(2)
  })
})
