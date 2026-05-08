/**
 * A configured Drizzle `db` instance. Typed as `unknown` to avoid pulling
 * drizzle-orm types into the public surface — cast to the appropriate drizzle
 * type in your consuming code.
 *
 * @example
 * import { drizzle } from 'drizzle-orm/bun-sqlite'
 * const db = drizzle(sqlite) // db satisfies DrizzleDb
 */
export type DrizzleDb = unknown

/**
 * A driver factory returned by `sqliteDriver` or `postgresJsDriver`.
 *
 * Drivers are lazy: the underlying adapter module is imported inside `build()`
 * so unused drivers do not require their peer dependencies to be installed.
 *
 * @example
 * const driver = sqliteDriver({ filename: ':memory:' })
 * const db = driver.build()
 */
export interface DrizzleDriver {
  /** Builds and returns a configured drizzle `db` instance. */
  build(): unknown
}

/**
 * Options accepted by `DrizzleModule.forRoot`.
 *
 * @example
 * DrizzleModule.forRoot({
 *   driver: sqliteDriver({ filename: ':memory:' }),
 *   schema: { cats: catsTable },
 * })
 */
export interface DrizzleOptions {
  /** The driver factory to use for building the drizzle instance. */
  driver: DrizzleDriver
  /**
   * Optional schema object passed through to the drizzle factory.
   * Enables type-safe `db.query.*` relational queries.
   */
  schema?: unknown
}
