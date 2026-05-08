import { Module } from '@banhmi/common'
import { DRIZZLE_DB } from './tokens'
import type { DrizzleOptions } from './types'

/**
 * NestJS-style dynamic module that wraps `drizzle-orm` in Banhmi's DI system.
 *
 * Use `DrizzleModule.forRoot(opts)` at the application root to build the
 * drizzle `db` instance and register it under the `DRIZZLE_DB` token.
 *
 * Supported drivers (imported separately):
 * - `sqliteDriver` — `bun:sqlite` via `drizzle-orm/bun-sqlite`
 * - `postgresJsDriver` — `postgres-js` via `drizzle-orm/postgres-js`
 *
 * @example
 * import { DrizzleModule, sqliteDriver } from '@banhmi/drizzle'
 * import * as schema from './schema'
 *
 * @Module({
 *   imports: [
 *     DrizzleModule.forRoot({
 *       driver: sqliteDriver({ filename: ':memory:' }),
 *       schema,
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class DrizzleModule {
  /**
   * Creates a root-level module that initialises the drizzle `db` instance via
   * the given driver and registers it under the `DRIZZLE_DB` token.
   *
   * @example
   * DrizzleModule.forRoot({ driver: sqliteDriver({ filename: ':memory:' }) })
   */
  static forRoot(opts: DrizzleOptions) {
    @Module({
      providers: [
        {
          provide: DRIZZLE_DB,
          useFactory: () => opts.driver.build(),
        },
      ],
      exports: [DRIZZLE_DB],
    })
    class DrizzleRootModule {}

    return DrizzleRootModule
  }
}
