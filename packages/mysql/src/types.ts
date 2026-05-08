/**
 * Options for configuring the MySQL connection via `Bun.SQL` with the `mysql`
 * adapter.
 *
 * `Bun.SQL` supports MySQL and MariaDB natively in Bun ≥ 1.2 via the
 * `adapter: 'mysql'` option. No external driver packages are required.
 *
 * @example
 * MysqlModule.forRoot({ url: 'mysql://user:pass@localhost/mydb', max: 10 })
 */
export interface MysqlOptions {
  /**
   * Full MySQL connection URL (`mysql://…`).
   * Falls back to `Bun.env.MYSQL_URL` when omitted.
   */
  url?: string
  /** Hostname of the MySQL server. Defaults to `localhost`. */
  hostname?: string
  /** Database / schema name. Defaults to `mysql`. */
  database?: string
  /** Database user. Defaults to `root`. */
  user?: string
  /** Database password. Defaults to an empty string. */
  password?: string
  /** Maximum number of connections in the pool. */
  max?: number
}

/**
 * A `Bun.SQL` tagged-template instance configured for MySQL.
 *
 * Used as both a tagged template tag (`` sql`SELECT 1` ``) and a callable
 * helper for identifier quoting (`` sql('tableName') ``).
 *
 * Backed by `Bun.SQL` with `adapter: 'mysql'` — requires Bun ≥ 1.2 and a
 * running MySQL or MariaDB server.
 *
 * @example
 * const rows = await sql`SELECT * FROM users WHERE id = ${id}`
 */
export type Sql = ReturnType<typeof Bun.SQL>
