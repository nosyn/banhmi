import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import {
  MONGO_DB,
  MongoModule,
  MongoRepository,
  Repository,
} from '../src/index'

/**
 * Integration tests that run against a real MongoDB server.
 *
 * These tests are gated on the `MONGO_URL` environment variable. When the
 * variable is not set the entire suite is skipped so CI stays green without
 * MongoDB.
 *
 * Set `MONGO_URL=mongodb://localhost:27017` to run them.
 */

const RUN = Boolean(Bun.env.MONGO_URL)

describe.if(RUN)('MongoModule — integration (MONGO_URL required)', () => {
  interface CatDoc {
    _id?: unknown
    name: string
    breed: string
  }

  class Cat implements CatDoc {
    name!: string
    breed!: string
  }

  @Repository(Cat)
  class CatRepository extends MongoRepository<CatDoc> {
    static inject = [MONGO_DB] as const
    constructor(db: { collection: (name: string) => unknown }) {
      super(db as Parameters<typeof MongoRepository.prototype.constructor>[0])
    }
  }

  let app: Awaited<ReturnType<typeof BanhmiFactory.create>>
  let repo: CatRepository

  beforeAll(async () => {
    @Module({
      imports: [
        MongoModule.forRoot({
          url: Bun.env.MONGO_URL ?? '',
          database: 'banhmi_integration_test',
        }),
        MongoModule.forFeature([CatRepository]),
      ],
    })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    repo = app.container.resolve(CatRepository)

    // Clean the collection before tests
    const db = app.container.resolve(MONGO_DB) as {
      collection: (name: string) => {
        deleteMany: (filter: unknown) => Promise<unknown>
      }
    }
    await db.collection('cat').deleteMany({})
  })

  afterAll(async () => {
    const db = app.container.resolve(MONGO_DB) as {
      collection: (name: string) => { drop: () => Promise<unknown> }
    }
    try {
      await db.collection('cat').drop()
    } catch {
      // Collection may not exist if all tests were skipped
    }
    await app.close()
  })

  test('insertOne then findOne returns the document', async () => {
    const result = await repo.insertOne({ name: 'Whiskers', breed: 'Siamese' })
    expect(result.acknowledged).toBe(true)

    const found = await repo.findOne({ name: 'Whiskers' })
    expect(found).not.toBeNull()
    expect(found?.name).toBe('Whiskers')
  })

  test('find returns all matching documents', async () => {
    await repo.insertOne({ name: 'Mittens', breed: 'Persian' })
    const all = await repo.find({})
    expect(all.length).toBeGreaterThanOrEqual(1)
  })

  test('updateOne modifies the document', async () => {
    await repo.insertOne({ name: 'Felix', breed: 'Tabby' })
    const result = await repo.updateOne(
      { name: 'Felix' },
      { $set: { breed: 'Maine Coon' } },
    )
    expect(result.acknowledged).toBe(true)
    expect(result.modifiedCount).toBe(1)

    const updated = await repo.findOne({ name: 'Felix' })
    expect(updated?.breed).toBe('Maine Coon')
  })

  test('deleteOne removes the document', async () => {
    await repo.insertOne({ name: 'Shadow', breed: 'Black Cat' })
    const result = await repo.deleteOne({ name: 'Shadow' })
    expect(result.acknowledged).toBe(true)
    expect(result.deletedCount).toBe(1)

    const found = await repo.findOne({ name: 'Shadow' })
    expect(found).toBeNull()
  })
})

describe.if(!RUN)(
  'MongoModule — integration (skipped: MONGO_URL not set)',
  () => {
    test('skipped — set MONGO_URL to run integration tests', () => {
      expect(true).toBe(true)
    })
  },
)
