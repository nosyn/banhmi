import { afterEach, describe, expect, mock, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import {
  MONGO_DB,
  MongoModule,
  MongoRepository,
  Repository,
} from '../src/index'

/**
 * Creates a mock MongoDB `Db` that resolves without a real server.
 * We mock the `mongodb` module so that `MongoModule.forRoot` never tries
 * to establish a real TCP connection.
 */
function createMockDb() {
  const db = {
    collection: (_name: string) => ({
      findOne: mock(() => Promise.resolve(null)),
      find: mock(() => ({ toArray: () => Promise.resolve([]) })),
      insertOne: mock(() =>
        Promise.resolve({ acknowledged: true, insertedId: 'x' }),
      ),
      updateOne: mock(() =>
        Promise.resolve({
          acknowledged: true,
          matchedCount: 1,
          modifiedCount: 1,
        }),
      ),
      deleteOne: mock(() =>
        Promise.resolve({ acknowledged: true, deletedCount: 1 }),
      ),
    }),
  }
  return db
}

describe('MongoModule.forRoot (mocked MongoClient)', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('registers a Db instance as MONGO_DB', async () => {
    const mockDb = createMockDb()

    // Mock the mongodb module before MongoModule.forRoot runs its useFactory
    mock.module('mongodb', () => ({
      MongoClient: class {
        connect() {
          return Promise.resolve()
        }
        db(_name: string) {
          return mockDb
        }
      },
    }))

    @Module({
      imports: [
        MongoModule.forRoot({
          url: 'mongodb://localhost:27017',
          database: 'test',
        }),
      ],
    })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    const db = app.container.resolve(MONGO_DB)
    expect(db).toBeDefined()
    expect(typeof db).toBe('object')
  })

  test('MONGO_DB is exported and resolvable', async () => {
    mock.module('mongodb', () => ({
      MongoClient: class {
        connect() {
          return Promise.resolve()
        }
        db(_name: string) {
          return createMockDb()
        }
      },
    }))

    @Module({
      imports: [
        MongoModule.forRoot({
          url: 'mongodb://localhost:27017',
          database: 'test2',
        }),
      ],
    })
    class AppModule2 {}

    app = await BanhmiFactory.create(AppModule2)
    await app.listen(0)
    expect(() => app?.container.resolve(MONGO_DB)).not.toThrow()
  })
})

describe('MongoModule.forFeature (mocked MongoClient)', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('registers repository class as a provider', async () => {
    const mockDb = createMockDb()

    mock.module('mongodb', () => ({
      MongoClient: class {
        connect() {
          return Promise.resolve()
        }
        db(_name: string) {
          return mockDb
        }
      },
    }))

    class Cat {
      name!: string
    }

    @Repository(Cat)
    class CatRepository extends MongoRepository<Cat> {
      static inject = [MONGO_DB] as const
      constructor(db: typeof mockDb) {
        super(db)
      }
    }

    @Module({
      imports: [
        MongoModule.forRoot({
          url: 'mongodb://localhost:27017',
          database: 'cats',
        }),
        MongoModule.forFeature([CatRepository]),
      ],
    })
    class AppModule3 {}

    app = await BanhmiFactory.create(AppModule3)
    await app.listen(0)

    const repo = app.container.resolve(CatRepository)
    expect(repo).toBeDefined()
    expect(repo).toBeInstanceOf(CatRepository)
    expect(repo.collectionName).toBe('cat')
  })
})
