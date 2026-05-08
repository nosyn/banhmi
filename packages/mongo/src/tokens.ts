import { Token } from '@banhmi/common'

/**
 * DI token for the MongoDB `Db` instance registered by `MongoModule.forRoot`.
 *
 * @example
 * class CatRepository {
 *   static inject = [MONGO_DB] as const
 *   constructor(private readonly db: Db) {}
 * }
 */
export const MONGO_DB = Token<unknown>('MONGO_DB')
