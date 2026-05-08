import type { HealthIndicator } from '../types'

/**
 * A minimal SQL connection interface that supports template-literal queries.
 *
 * Compatible with `Bun.sql` and similar interfaces.
 *
 * @example
 * const sql = new Bun.SQL({ url: 'postgres://...' })
 * dbIndicator(sql)
 */
export type SqlConnection = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown>

/**
 * Built-in health indicator that checks a database connection by running
 * a `SELECT 1` probe query.
 *
 * @param sql - A `Bun.sql`-compatible template-tag function.
 * @returns A {@link HealthIndicator} function.
 *
 * @example
 * import { sql } from 'bun'
 *
 * HealthModule.forRoot({
 *   indicators: {
 *     db: dbIndicator(sql),
 *   },
 * })
 */
export function dbIndicator(sql: SqlConnection): HealthIndicator {
  return async () => {
    try {
      await sql`SELECT 1`
      return { status: 'up' }
    } catch (err) {
      return {
        status: 'down',
        details: { error: String(err) },
      }
    }
  }
}
