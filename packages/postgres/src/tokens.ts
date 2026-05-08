import { Token } from '@banhmi/common'
import type { Sql } from './types'

/**
 * DI token for the Postgres `Bun.SQL` tagged-template instance.
 *
 * @example
 * static inject = [POSTGRES_SQL] as const
 * constructor(private readonly sql: Sql) {}
 */
export const POSTGRES_SQL = Token<Sql>('POSTGRES_SQL')
