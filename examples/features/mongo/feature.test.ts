import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import {
  MONGO_DB,
  MongoModule,
  MongoRepository,
  Repository,
} from '@banhmi/mongo'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Module } from 'banhmi'

/** Cat entity used in all test suites. */
interface Cat {
  _id?: unknown
  name: string
  breed: string
}

class CatEntity {}

@Repository(CatEntity)
class CatRepository extends MongoRepository<Cat> {
  static inject = [MONGO_DB] as const
  constructor(db: { collection: (name: string) => unknown }) {
    super(db as Parameters<typeof MongoRepository.prototype.constructor>[0])
  }

  override get collectionName(): string {
    return 'cats'
  }
}

/**
 * Sets up the mongodb mock and returns a freshly created Banhmi application
 * backed by an in-memory document store.
 */
async function createMockedApp() {
  const docs: Record<string, unknown>[] = []
  let insertCounter = 0

  const mockCollection = {
    findOne: mock((filter: unknown) => {
      const f = filter as Record<string, unknown>
      const found = docs.find((d) =>
        Object.entries(f).every(
          ([k, v]) => (d as Record<string, unknown>)[k] === v,
        ),
      )
      return Promise.resolve(found ?? null)
    }),
    find: mock((_filter: unknown) => ({
      toArray: () => Promise.resolve([...docs]),
    })),
    insertOne: mock((doc: unknown) => {
      const id = `id-${insertCounter++}`
      const record = { ...(doc as Record<string, unknown>), _id: id }
      docs.push(record)
      return Promise.resolve({ acknowledged: true, insertedId: id })
    }),
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
  }

  mock.module('mongodb', () => ({
    MongoClient: class {
      connect() {
        return Promise.resolve()
      }
      db(_name: string) {
        return { collection: (_collName: string) => mockCollection }
      }
    },
    ObjectId: class {
      constructor(public id: string) {}
    },
  }))

  @Module({
    imports: [
      MongoModule.forRoot({
        url: 'mongodb://localhost:27017',
        database: 'test',
      }),
      MongoModule.forFeature([CatRepository]),
    ],
  })
  class TestAppModule {}

  const app = await BanhmiFactory.create(TestAppModule)
  await app.listen(0)

  return { app, docs, mockCollection }
}

describe('mongo feature: module registration (mocked)', () => {
  let app: BanhmiApplication

  beforeAll(async () => {
    ;({ app } = await createMockedApp())
  })

  afterAll(async () => {
    await app.close()
  })

  test('CatRepository is registered and resolvable', () => {
    const repo = app.container.resolve(CatRepository)
    expect(repo).toBeDefined()
    expect(repo).toBeInstanceOf(CatRepository)
  })

  test('MONGO_DB is resolved from the container', () => {
    const db = app.container.resolve(MONGO_DB)
    expect(db).toBeDefined()
    expect(typeof db).toBe('object')
  })

  test('collectionName returns "cats" (overridden)', () => {
    const repo = app.container.resolve(CatRepository)
    expect(repo.collectionName).toBe('cats')
  })
})

describe('mongo feature: repository operations (mocked)', () => {
  let app: BanhmiApplication
  let repo: CatRepository
  let docs: Record<string, unknown>[]

  beforeAll(async () => {
    ;({ app, docs } = await createMockedApp())
    repo = app.container.resolve(CatRepository)
  })

  afterAll(async () => {
    await app.close()
  })

  test('insertOne adds a document', async () => {
    await repo.insertOne({ name: 'Kitty', breed: 'Persian' })
    expect(docs).toHaveLength(1)
    expect(docs[0]?.name).toBe('Kitty')
  })

  test('find returns all documents', async () => {
    const all = await repo.find({})
    expect(Array.isArray(all)).toBe(true)
    expect(all.length).toBeGreaterThanOrEqual(1)
  })

  test('findOne returns matching document', async () => {
    await repo.insertOne({ name: 'Whiskers', breed: 'Siamese' })
    const found = await repo.findOne({ name: 'Whiskers' })
    expect(found).not.toBeNull()
  })

  test('updateOne returns acknowledged result', async () => {
    const result = await repo.updateOne(
      { name: 'Kitty' },
      { $set: { breed: 'Tabby' } },
    )
    expect(result.acknowledged).toBe(true)
  })

  test('deleteOne returns acknowledged result', async () => {
    const result = await repo.deleteOne({ name: 'Kitty' })
    expect(result.acknowledged).toBe(true)
  })
})

const RUN_INTEGRATION = Boolean(Bun.env.MONGO_URL)

describe.if(RUN_INTEGRATION)(
  'mongo feature: integration (MONGO_URL required)',
  () => {
    let app: BanhmiApplication
    let base: string

    beforeAll(async () => {
      const { AppModule } = await import('./index')
      app = await BanhmiFactory.create(AppModule)
      await app.listen(0)
      base = app.getUrl()
    })

    afterAll(async () => {
      await app.close()
    })

    test('POST /cats creates a cat', async () => {
      const res = await fetch(`${base}/cats`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Shadow', breed: 'Black' }),
      })
      expect(res.status).toBe(200)
    })

    test('GET /cats returns array', async () => {
      const res = await fetch(`${base}/cats`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    })
  },
)

describe.if(!RUN_INTEGRATION)(
  'mongo feature: integration (skipped: MONGO_URL not set)',
  () => {
    test('set MONGO_URL to run integration tests', () => {
      expect(true).toBe(true)
    })
  },
)
