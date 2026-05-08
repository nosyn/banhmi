import { Token } from '@banhmi/common'
import type { Sql } from './types'

/**
 * DI token for the MySQL `Bun.SQL` tagged-template instance.
 *
 * @example
 * static inject = [MYSQL_SQL] as const
 * constructor(private readonly sql: Sql) {}
 */
export const MYSQL_SQL = Token<Sql>('MYSQL_SQL')
