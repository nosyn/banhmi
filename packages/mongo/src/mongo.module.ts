import { Module } from '@banhmi/common'
import { InjectCollection } from './inject-mongo'
import { MONGO_DB } from './tokens'
import type { MongoOptions } from './types'

/**
 * NestJS-style dynamic module that wraps the `mongodb` driver in Banhmi's
 * DI system.
 *
 * Use `MongoModule.forRoot(opts)` at the application root to connect the
 * `MongoClient` and register a `Db` instance under the `MONGO_DB` token.
 *
 * Use `MongoModule.forFeature(entities)` inside feature modules to register
 * typed `Collection<T>` providers for each entity alongside any
 * `@Repository(Entity)`-decorated classes you pass.
 *
 * @example
 * @Module({
 *   imports: [
 *     MongoModule.forRoot({ url: 'mongodb://localhost:27017', database: 'mydb' }),
 *     MongoModule.forFeature([CatRepository]),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class MongoModule {
  /**
   * Creates a root-level module that connects a `MongoClient` and provides the
   * selected `Db` instance under the `MONGO_DB` token.
   *
   * The `mongodb` peer dependency is lazy-imported inside `useFactory` so the
   * package compiles without the peer installed.
   *
   * @example
   * MongoModule.forRoot({ url: 'mongodb://localhost:27017', database: 'cats' })
   */
  static forRoot(opts: MongoOptions) {
    @Module({
      providers: [
        {
          provide: MONGO_DB,
          useFactory: () => {
            // Use require() so the factory stays synchronous — the DI container
            // does not await async factories. MongoClient.db() returns a Db
            // object immediately; the driver connects lazily on first operation.
            const { MongoClient } = require('mongodb') as {
              MongoClient: new (
                url: string,
              ) => {
                db: (name: string) => unknown
              }
            }
            const client = new MongoClient(opts.url)
            return client.db(opts.database)
          },
        },
      ],
      exports: [MONGO_DB],
    })
    class MongoRootModule {}

    return MongoRootModule
  }

  /**
   * Creates a feature-level module that registers repository classes and
   * typed `Collection<T>` providers for each entity decorated with
   * `@Repository(Entity)`.
   *
   * The collection token for each entity is `InjectCollection(Entity)`.
   * Repository classes are registered as class providers (they must have
   * `static inject = [MONGO_DB] as const` in order to receive the `Db`).
   *
   * @example
   * MongoModule.forFeature([CatRepository])
   */
  static forFeature(
    repositories: (new (...args: unknown[]) => unknown)[],
    entities: (new () => unknown)[] = [],
  ) {
    // Build collection providers for each explicitly named entity.
    const collectionProviders = entities.map((entity) => ({
      provide: InjectCollection(entity),
      inject: [MONGO_DB] as const,
      useFactory: (db: { collection: (name: string) => unknown }) =>
        db.collection(entity.name.toLowerCase()),
    }))

    @Module({
      providers: [
        ...collectionProviders,
        ...(repositories as { new (...args: unknown[]): unknown }[]),
      ],
      exports: [
        ...collectionProviders.map((p) => p.provide),
        ...(repositories as { new (...args: unknown[]): unknown }[]),
      ],
    })
    class MongoFeatureModule {}

    return MongoFeatureModule
  }
}
