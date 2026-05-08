import { Token } from '@banhmi/common'

/**
 * DI token for the Drizzle `db` instance registered by `DrizzleModule.forRoot`.
 *
 * @example
 * class CatService {
 *   static inject = [DRIZZLE_DB] as const
 *   constructor(private readonly db: DrizzleDb) {}
 * }
 */
export const DRIZZLE_DB = Token<unknown>('DRIZZLE_DB')
