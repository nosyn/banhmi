import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import type { Sql } from '../src/index'
import {
  BaseRepository,
  POSTGRES_SQL,
  PostgresModule,
  Repository,
} from '../src/index'

/**
 * Integration tests that run against a real Postgres database.
 *
 * These tests are gated on the `DATABASE_URL` environment variable. When the
 * variable is not set, the entire suite is skipped so the test run stays green
 * in environments without a Postgres server.
 *
 * Set `DATABASE_URL=postgres://user:pass@localhost/testdb` to run them.
 */

const RUN = Boolean(Bun.env.DATABASE_URL)

describe.if(RUN)('PostgresModule — integration (DATABASE_URL required)', () => {
  class User {
    id!: number
    name!: string
    email!: string
  }

  @Repository(User)
  class UserRepository extends BaseRepository<User> {
    static inject = [POSTGRES_SQL] as const
    constructor(sql: Sql) {
      super(sql)
    }
  }

  let app: Awaited<ReturnType<typeof BanhmiFactory.create>>
  let repo: UserRepository

  beforeAll(async () => {
    @Module({
      imports: [
        PostgresModule.forRoot({ url: Bun.env.DATABASE_URL }),
        PostgresModule.forFeature([UserRepository]),
      ],
    })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    repo = app.container.resolve(UserRepository)

    const sql = app.container.resolve(POSTGRES_SQL)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id   SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `
    await sql`TRUNCATE users RESTART IDENTITY`
  })

  afterAll(async () => {
    const sql = app.container.resolve(POSTGRES_SQL)
    await sql`DROP TABLE IF EXISTS users`
    await app.close()
  })

  test('insert then findById returns the row', async () => {
    const inserted = await repo.insert({
      name: 'Alice',
      email: 'alice@example.com',
    })
    expect(inserted.name).toBe('Alice')
    const found = await repo.findById(inserted.id)
    expect(found).not.toBeNull()
    expect(found?.name).toBe('Alice')
  })

  test('findAll returns all rows', async () => {
    await repo.insert({ name: 'Bob', email: 'bob@example.com' })
    const all = await repo.findAll()
    expect(all.length).toBeGreaterThanOrEqual(2)
  })

  test('update modifies the row', async () => {
    const created = await repo.insert({
      name: 'Charlie',
      email: 'charlie@example.com',
    })
    const updated = await repo.update(created.id, { name: 'Charles' })
    expect(updated?.name).toBe('Charles')
  })

  test('delete removes the row', async () => {
    const created = await repo.insert({
      name: 'Dave',
      email: 'dave@example.com',
    })
    await repo.delete(created.id)
    const found = await repo.findById(created.id)
    expect(found).toBeNull()
  })
})

describe.if(!RUN)(
  'PostgresModule — integration (skipped: DATABASE_URL not set)',
  () => {
    test('skipped — set DATABASE_URL to run integration tests', () => {
      expect(true).toBe(true)
    })
  },
)
