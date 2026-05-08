/**
 * Integration tests for the cats-mongo example.
 *
 * Default suite: uses mock.module() to replace the `mongodb` driver with an
 * in-memory document store — always runs, no real MongoDB required.
 *
 * Integration suite: gated on MONGO_URL — spins up the real AppModule and
 * exercises the HTTP endpoints against a live MongoDB instance.
 */

import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import type { BanhmiApplication } from '@banhmi/core'
import { MONGO_DB, MongoModule } from '@banhmi/mongo'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { Module } from 'banhmi'
import { CatsModule } from '../src/cats/cats.module'
import { CatsRepository } from '../src/cats/cats.repository'

// ─── Shared mock factory ──────────────────────────────────────────────────────

/**
 * Creates an in-memory MongoDB mock and wires a Banhmi app using it.
 *
 * The mock tracks all inserted documents so tests can assert directly on the
 * document store without going through the HTTP layer.
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
    deleteOne: mock((filter: unknown) => {
      const f = filter as Record<string, unknown>
      const idx = docs.findIndex((d) =>
        Object.entries(f).every(
          ([k, v]) => (d as Record<string, unknown>)[k] === v,
        ),
      )
      if (idx !== -1) docs.splice(idx, 1)
      return Promise.resolve({ acknowledged: true, deletedCount: 1 })
    }),
  }

  mock.module('mongodb', () => ({
    MongoClient: class {
      connect() {
        return Promise.resolve()
      }
      db(_name: string) {
        return { collection: (_col: string) => mockCollection }
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
      CatsModule,
    ],
  })
  class TestAppModule {}

  const app = await BanhmiFactory.create(TestAppModule)
  await app.listen(0)

  return { app, docs, mockCollection }
}

// ─── Mocked suite ─────────────────────────────────────────────────────────────

describe('cats-mongo: module registration (mocked)', () => {
  let app: BanhmiApplication

  beforeAll(async () => {
    ;({ app } = await createMockedApp())
  })

  afterAll(async () => {
    await app.close()
  })

  test('MONGO_DB token is resolvable', () => {
    const db = app.container.resolve(MONGO_DB)
    expect(db).toBeDefined()
    expect(typeof db).toBe('object')
  })

  test('CatsRepository is registered and resolvable', () => {
    const repo = app.container.resolve(CatsRepository)
    expect(repo).toBeDefined()
    expect(repo).toBeInstanceOf(CatsRepository)
  })

  test('CatsRepository.collectionName is "cats"', () => {
    const repo = app.container.resolve(CatsRepository)
    expect(repo.collectionName).toBe('cats')
  })
})

describe('cats-mongo: HTTP endpoints (mocked)', () => {
  let app: BanhmiApplication
  let base: string
  let docs: Record<string, unknown>[]

  beforeAll(async () => {
    ;({ app, docs } = await createMockedApp())
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('GET /cats returns empty array initially', async () => {
    const res = await fetch(`${base}/cats`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('POST /cats creates a cat', async () => {
    const res = await fetch(`${base}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Whiskers', age: 3 }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      acknowledged: boolean
      insertedId: string
    }
    expect(body.acknowledged).toBe(true)
    expect(typeof body.insertedId).toBe('string')
  })

  test('GET /cats returns the inserted cat', async () => {
    // Insert via POST first
    await fetch(`${base}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Luna', age: 2 }),
    })

    const res = await fetch(`${base}/cats`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(body.length).toBeGreaterThanOrEqual(1)
  })

  test('GET /cats/:id returns 404 for unknown id', async () => {
    const res = await fetch(`${base}/cats/nonexistent-id`)
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('not found')
  })

  test('DELETE /cats/:id removes the cat from the store', async () => {
    // Insert a cat directly into the mock store so we control the id
    const id = `delete-test-${Date.now()}`
    docs.push({ _id: id, name: 'TempCat', age: 1 })

    const before = docs.length
    const res = await fetch(`${base}/cats/${id}`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(docs.length).toBe(before - 1)
  })
})

// ─── Real Mongo integration suite ─────────────────────────────────────────────

const RUN_MONGO = Boolean(Bun.env.MONGO_URL)

describe.if(RUN_MONGO)('cats-mongo: integration (MONGO_URL required)', () => {
  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module')
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
      body: JSON.stringify({ name: 'MongoCat', age: 5 }),
    })
    expect(res.status).toBe(201)
  })

  test('GET /cats returns array', async () => {
    const res = await fetch(`${base}/cats`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

describe.if(!RUN_MONGO)(
  'cats-mongo: integration (skipped: MONGO_URL not set)',
  () => {
    test('set MONGO_URL to run real MongoDB integration tests', () => {
      expect(true).toBe(true)
    })
  },
)
