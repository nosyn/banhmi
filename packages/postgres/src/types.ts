/**
 * Options for configuring the Postgres connection via `Bun.SQL`.
 *
 * @example
 * PostgresModule.forRoot({ url: 'postgres://user:pass@localhost/mydb', max: 10 })
 */
export interface PostgresOptions {
  /** Full connection URL. Falls back to `Bun.env.DATABASE_URL` when omitted. */
  url?: string
  /** Hostname of the Postgres server. */
  hostname?: string
  /** Database name. */
  database?: string
  /** Database user. */
  user?: string
  /** Database password. */
  password?: string
  /** Maximum number of connections in the pool. */
  max?: number
}

/**
 * A `Bun.SQL` tagged-template instance for Postgres.
 *
 * Used as both a tagged template tag (`` sql`SELECT 1` ``) and a constructor
 * result. Expose as an opaque type so callers do not depend on Bun internals.
 *
 * @example
 * const rows = await sql`SELECT * FROM users WHERE id = ${id}`
 */
export type Sql = ReturnType<typeof Bun.SQL>
