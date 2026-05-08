import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import type { Sql } from '../src/index'
import {
  BaseRepository,
  MYSQL_SQL,
  MysqlModule,
  Repository,
} from '../src/index'

/**
 * Integration tests that run against a real MySQL / MariaDB database.
 *
 * These tests are gated on the `MYSQL_URL` environment variable. When the
 * variable is not set, the entire suite is skipped so the test run stays green
 * in environments without a MySQL server.
 *
 * Backed by `Bun.SQL` with `adapter: 'mysql'` — natively supported in
 * Bun ≥ 1.2.
 *
 * Set `MYSQL_URL=mysql://user:pass@localhost/testdb` to run them.
 */

const RUN = Boolean(Bun.env.MYSQL_URL)

describe.if(RUN)('MysqlModule — integration (MYSQL_URL required)', () => {
  class User {
    id!: number
    name!: string
    email!: string
  }

  @Repository(User)
  class UserRepository extends BaseRepository<User> {
    static inject = [MYSQL_SQL] as const
    constructor(sql: Sql) {
      super(sql)
    }
  }

  let app: Awaited<ReturnType<typeof BanhmiFactory.create>>
  let repo: UserRepository

  beforeAll(async () => {
    @Module({
      imports: [
        MysqlModule.forRoot({ url: Bun.env.MYSQL_URL }),
        MysqlModule.forFeature([UserRepository]),
      ],
    })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    repo = app.container.resolve(UserRepository)

    const sql = app.container.resolve(MYSQL_SQL)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id    INT AUTO_INCREMENT PRIMARY KEY,
        name  VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL
      )
    `
    await sql`TRUNCATE TABLE users`
  })

  afterAll(async () => {
    const sql = app.container.resolve(MYSQL_SQL)
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
  'MysqlModule — integration (skipped: MYSQL_URL not set)',
  () => {
    test('skipped — set MYSQL_URL to run integration tests', () => {
      expect(true).toBe(true)
    })
  },
)
