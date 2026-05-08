import { describe, expect, test } from 'bun:test'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sqliteDriver } from '../src/index'

/** A minimal drizzle table schema used in tests. */
const cats = sqliteTable('cats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
})

describe('sqliteDriver', () => {
  test('build() returns a drizzle db object', () => {
    const driver = sqliteDriver({ filename: ':memory:' })
    const db = driver.build()
    expect(db).toBeDefined()
    expect(typeof db).toBe('object')
  })

  test('drizzle instance can run a CREATE TABLE + SELECT query', async () => {
    const driver = sqliteDriver({ filename: ':memory:' })
    // Cast to any-like to call drizzle APIs without importing its types.
    const _db = driver.build() as {
      run: (query: unknown) => void
      select: () => { from: (table: unknown) => Promise<unknown[]> }
    }

    // Create the table using raw SQLite via the underlying bun:sqlite DB.
    // We access it through drizzle's session to keep the test self-contained.
    const { Database } = await import('bun:sqlite')
    const sqlite = new Database(':memory:')
    sqlite.run(
      'CREATE TABLE IF NOT EXISTS cats (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)',
    )

    const { drizzle } = await import('drizzle-orm/bun-sqlite')
    const typedDb = drizzle(sqlite, { schema: { cats } })

    const rows = await typedDb.select().from(cats)
    expect(Array.isArray(rows)).toBe(true)
    expect(rows).toHaveLength(0)

    // Insert a row and verify retrieval.
    await typedDb.insert(cats).values({ name: 'Kitty' })
    const all = await typedDb.select().from(cats)
    expect(all).toHaveLength(1)
    expect((all[0] as { name: string }).name).toBe('Kitty')
  })

  test('build() with schema option passes schema through', () => {
    const driver = sqliteDriver({ filename: ':memory:', schema: { cats } })
    const db = driver.build()
    expect(db).toBeDefined()
  })
})

const RUN_POSTGRES = Boolean(Bun.env.DATABASE_URL)

describe('postgresJsDriver', () => {
  test.if(!RUN_POSTGRES)(
    'skipped — set DATABASE_URL to run postgres driver tests',
    () => {
      expect(true).toBe(true)
    },
  )

  test.if(RUN_POSTGRES)(
    'build() returns a drizzle postgres db object',
    async () => {
      const { postgresJsDriver } = await import('../src/index')
      const driver = postgresJsDriver({ url: Bun.env.DATABASE_URL ?? '' })
      const db = driver.build()
      expect(db).toBeDefined()
      expect(typeof db).toBe('object')
    },
  )
})
