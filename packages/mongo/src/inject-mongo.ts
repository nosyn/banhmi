import { Token } from '@banhmi/common'

/**
 * Parameter decorator that marks a constructor argument as injected from the
 * `MONGO_DB` token (a MongoDB `Db` instance).
 *
 * In practice, injection is driven by the static `inject` tuple — this
 * decorator is a no-op at runtime but serves as readable documentation at
 * the call-site.
 *
 * @example
 * class CatService {
 *   static inject = [MONGO_DB] as const
 *   constructor(@InjectMongo() private readonly db: Db) {}
 * }
 */
export function InjectMongo() {
  return (_target: unknown, _context: ClassFieldDecoratorContext): void => {}
}

/**
 * Creates a DI token for a MongoDB `Collection<T>` registered by
 * `MongoModule.forFeature`.
 *
 * Use `InjectCollection(Entity)` alongside `static inject = [InjectCollection(Entity)]`
 * to get a typed `Collection<T>` directly from DI.
 *
 * @example
 * import { InjectCollection } from '@banhmi/mongo'
 *
 * class CatService {
 *   static inject = [InjectCollection(Cat)] as const
 *   constructor(private readonly col: Collection<Cat>) {}
 * }
 */
export function InjectCollection(entity: new () => unknown) {
  return Token<unknown>(`MONGO_COLLECTION:${entity.name}`)
}

export { MONGO_DB as INJECT_MONGO_DB } from './tokens'
