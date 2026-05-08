import type { DrizzleDriver } from '../types'

/**
 * Options for the bun:sqlite Drizzle driver.
 *
 * @example
 * sqliteDriver({ filename: ':memory:' })
 * sqliteDriver({ filename: './db.sqlite', schema: { cats: catsTable } })
 */
export interface SqliteDriverOptions {
  /** SQLite database file path. Use `':memory:'` for an in-memory database. */
  filename: string
  /**
   * Optional schema object forwarded to the drizzle factory.
   * Enables type-safe `db.query.*` relational APIs.
   */
  schema?: unknown
}

/**
 * Creates a Drizzle driver backed by `bun:sqlite` via `drizzle-orm/bun-sqlite`.
 *
 * The adapter module is lazy-imported inside `build()` so this driver has no
 * hard dependency on `drizzle-orm` at module evaluation time.
 *
 * @example
 * import { sqliteDriver } from '@banhmi/drizzle'
 *
 * DrizzleModule.forRoot({ driver: sqliteDriver({ filename: ':memory:' }) })
 */
export function sqliteDriver(opts: SqliteDriverOptions): DrizzleDriver {
  return {
    build() {
      // Lazy-import so unused drivers don't pull drizzle deps into the bundle.
      // bun:sqlite is built into Bun — no install needed.
      const { Database } = require('bun:sqlite') as typeof import('bun:sqlite')
      const { drizzle } = require('drizzle-orm/bun-sqlite') as {
        drizzle: (db: unknown, opts?: { schema?: unknown }) => unknown
      }

      const db = new Database(opts.filename)
      return drizzle(db, opts.schema ? { schema: opts.schema } : undefined)
    },
  }
}
