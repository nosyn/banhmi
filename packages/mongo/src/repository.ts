const REPO_ENTITY = Symbol('banhmi:mongo:repo_entity')
const REPO_COLLECTION = Symbol('banhmi:mongo:repo_collection')

/**
 * Marks a class as a MongoDB repository for the given entity.
 *
 * The decorator stores the entity constructor and derives the collection name
 * from the entity class name (lowercased). Override the collection name by
 * implementing `get collectionName()` in the subclass.
 *
 * @example
 * class Cat { name!: string; breed!: string }
 *
 * @Repository(Cat)
 * class CatRepository extends MongoRepository<Cat> {}
 */
export function Repository(entity: new () => unknown) {
  return (_target: unknown, context: ClassDecoratorContext): void => {
    context.metadata[REPO_ENTITY] = entity
    context.metadata[REPO_COLLECTION] = entity.name.toLowerCase()
  }
}

/**
 * A minimal document shape with an optional MongoDB `_id` field.
 *
 * `MongoRepository<T>` expects documents of this shape so that `findById`
 * can accept a string and convert it to `ObjectId` internally.
 */
export interface MongoDocument {
  _id?: unknown
}

/**
 * Base repository class that wraps a MongoDB `Collection<T>`.
 *
 * Subclass this, apply `@Repository(EntityClass)`, and inject a `Db` via
 * `static inject = [MONGO_DB] as const`. The `collectionName` getter defaults
 * to the entity class name lowercased; override it in the subclass when needed.
 *
 * @example
 * class Cat { name!: string; breed!: string }
 *
 * @Repository(Cat)
 * class CatRepository extends MongoRepository<Cat> {
 *   static inject = [MONGO_DB] as const
 *   constructor(db: Db) { super(db) }
 * }
 *
 * const repo = new CatRepository(db)
 * const cats = await repo.find({})
 */
export abstract class MongoRepository<T extends MongoDocument> {
  /** MongoDB collection name. Defaults to entity name lower-cased. */
  get collectionName(): string {
    const meta = (
      this.constructor as unknown as {
        [Symbol.metadata]?: Record<symbol, unknown>
      }
    )[Symbol.metadata]
    return (meta?.[REPO_COLLECTION] as string | undefined) ?? 'unknown'
  }

  constructor(
    protected readonly db: {
      collection: (name: string) => Collection<T>
    },
  ) {}

  /** Returns the underlying `Collection<T>` instance. */
  protected get col(): Collection<T> {
    return this.db.collection(this.collectionName)
  }

  /**
   * Finds a document by its string representation of `_id`.
   *
   * Returns `null` when no matching document is found.
   *
   * @example
   * const cat = await repo.findById('507f1f77bcf86cd799439011')
   */
  async findById(id: string): Promise<T | null> {
    let objectId: unknown
    try {
      const { ObjectId } = await import('mongodb')
      objectId = new ObjectId(id)
    } catch {
      // If ObjectId import fails (mongodb not installed or invalid id),
      // fall back to string comparison
      objectId = id
    }
    return this.col.findOne({
      _id: objectId,
    } as unknown as import('mongodb').Filter<T>)
  }

  /**
   * Finds the first document matching the given filter.
   *
   * Returns `null` when no matching document exists.
   *
   * @example
   * const cat = await repo.findOne({ name: 'Whiskers' })
   */
  async findOne(filter: unknown): Promise<T | null> {
    return this.col.findOne(filter as import('mongodb').Filter<T>)
  }

  /**
   * Returns all documents matching the given filter.
   *
   * Pass an empty object `{}` to return all documents.
   *
   * @example
   * const cats = await repo.find({ breed: 'Siamese' })
   */
  async find(filter: unknown): Promise<T[]> {
    return this.col.find(filter as import('mongodb').Filter<T>).toArray()
  }

  /**
   * Inserts a new document and returns the insertion result.
   *
   * @example
   * const result = await repo.insertOne({ name: 'Kitty', breed: 'Persian' })
   */
  async insertOne(
    doc: Omit<T, '_id'>,
  ): Promise<import('mongodb').InsertOneResult> {
    return this.col.insertOne(
      doc as import('mongodb').OptionalUnlessRequiredId<T>,
    )
  }

  /**
   * Updates the first document matching the filter with the given update
   * descriptor and returns the update result.
   *
   * @example
   * await repo.updateOne({ name: 'Kitty' }, { $set: { breed: 'Siamese' } })
   */
  async updateOne(
    filter: unknown,
    update: unknown,
  ): Promise<import('mongodb').UpdateResult> {
    return this.col.updateOne(
      filter as import('mongodb').Filter<T>,
      update as import('mongodb').UpdateFilter<T>,
    )
  }

  /**
   * Deletes the first document matching the filter and returns the deletion result.
   *
   * @example
   * await repo.deleteOne({ name: 'Kitty' })
   */
  async deleteOne(filter: unknown): Promise<import('mongodb').DeleteResult> {
    return this.col.deleteOne(filter as import('mongodb').Filter<T>)
  }
}

/**
 * Minimal structural type for a MongoDB `Collection<T>`.
 *
 * We use this instead of importing from `mongodb` directly so the package
 * compiles without the peer dep installed.
 */
interface Collection<T> {
  findOne: (filter: unknown) => Promise<T | null>
  find: (filter: unknown) => { toArray: () => Promise<T[]> }
  insertOne: (doc: unknown) => Promise<unknown>
  updateOne: (filter: unknown, update: unknown) => Promise<unknown>
  deleteOne: (filter: unknown) => Promise<unknown>
}
