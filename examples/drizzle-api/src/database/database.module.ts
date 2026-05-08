import { DRIZZLE_DB } from '@banhmi/drizzle'
import { Module } from 'banhmi'
import { sql } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

/**
 * Re-export the DRIZZLE_DB token so services can import it from a single
 * internal location rather than directly from `@banhmi/drizzle`.
 */
export { DRIZZLE_DB as DB_TOKEN } from '@banhmi/drizzle'

/**
 * Type of the Drizzle DB instance used throughout this app.
 */
export type DrizzleDB = BunSQLiteDatabase<typeof schema>

/**
 * Initialise the SQLite schema (idempotent `CREATE TABLE IF NOT EXISTS`).
 *
 * Called once during module startup. Allows both the in-memory database used
 * in tests and the persisted file used in development to be fully self-contained
 * without requiring a separate `drizzle-kit push` step.
 */
function initSchema(db: BunSQLiteDatabase<typeof schema>): void {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)
}

/**
 * Database module that wires up `@banhmi/drizzle` with an in-memory SQLite
 * database and the full application schema.
 *
 * The module automatically creates the `users` and `posts` tables so neither
 * `drizzle-kit push` nor a migration step is required during development or
 * in tests.
 *
 * To use a persisted database set `filename` to a file path, e.g. `'./drizzle-api.sqlite'`.
 */
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useFactory: () => {
        // Use the underlying drizzle bun-sqlite driver directly so we can run
        // DDL before returning the instance.
        const { Database } =
          require('bun:sqlite') as typeof import('bun:sqlite')
        const { drizzle } = require('drizzle-orm/bun-sqlite') as {
          drizzle: (
            db: unknown,
            opts?: { schema?: unknown },
          ) => BunSQLiteDatabase<typeof schema>
        }
        const filename = Bun.env.SQLITE_FILE ?? ':memory:'
        const sqlite = new Database(filename)
        const db = drizzle(sqlite, { schema })
        initSchema(db)
        return db
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
