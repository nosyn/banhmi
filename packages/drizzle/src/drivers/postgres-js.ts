import type { DrizzleDriver } from '../types'

/**
 * Options for the postgres-js Drizzle driver.
 *
 * @example
 * postgresJsDriver({ url: 'postgres://user:pass@localhost/mydb' })
 * postgresJsDriver({ url: process.env.DATABASE_URL!, max: 10 })
 */
export interface PostgresJsDriverOptions {
  /** Full Postgres connection URL. */
  url: string
  /**
   * Maximum number of connections in the pool.
   * Forwarded to `postgres` as the `max` option.
   */
  max?: number
  /**
   * Optional schema object forwarded to the drizzle factory.
   * Enables type-safe `db.query.*` relational APIs.
   */
  schema?: unknown
}

/**
 * Creates a Drizzle driver backed by `postgres-js` via
 * `drizzle-orm/postgres-js`.
 *
 * Both `drizzle-orm` and `postgres` must be installed as peer dependencies.
 * The adapter module is lazy-imported inside `build()` so this driver is a
 * no-op if the peer is absent and the driver is never called.
 *
 * @example
 * import { postgresJsDriver } from '@banhmi/drizzle'
 *
 * DrizzleModule.forRoot({
 *   driver: postgresJsDriver({ url: Bun.env.DATABASE_URL ?? '' }),
 * })
 */
export function postgresJsDriver(opts: PostgresJsDriverOptions): DrizzleDriver {
  return {
    build() {
      // Lazy-import: both drizzle-orm/postgres-js and postgres are peers.
      const postgres = require('postgres') as (
        url: string,
        opts?: { max?: number },
      ) => unknown
      const { drizzle } = require('drizzle-orm/postgres-js') as {
        drizzle: (client: unknown, opts?: { schema?: unknown }) => unknown
      }

      const client = postgres(
        opts.url,
        opts.max ? { max: opts.max } : undefined,
      )
      return drizzle(client, opts.schema ? { schema: opts.schema } : undefined)
    },
  }
}
