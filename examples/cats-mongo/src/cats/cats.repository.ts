import { MONGO_DB, MongoRepository, Repository } from '@banhmi/mongo'
import { Cat } from './cats.entity'

/**
 * MongoDB repository for `Cat` documents.
 *
 * Uses `@Repository(Cat)` to derive metadata and extends `MongoRepository<Cat>`
 * which provides `find`, `findOne`, `findById`, `insertOne`, `updateOne`, and
 * `deleteOne` backed by a real or mocked MongoDB collection.
 *
 * The `collectionName` is overridden to `cats` (default would be `cat`).
 */
@Repository(Cat)
export class CatsRepository extends MongoRepository<Cat> {
  static inject = [MONGO_DB] as const

  constructor(db: { collection: (name: string) => unknown }) {
    super(db as Parameters<typeof MongoRepository.prototype.constructor>[0])
  }

  /** Use `cats` as the MongoDB collection name. */
  override get collectionName(): string {
    return 'cats'
  }
}
