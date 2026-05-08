import { Module } from '@banhmi/common'
import { POSTGRES_SQL } from './tokens'
import type { PostgresOptions } from './types'

/**
 * NestJS-style dynamic module that provides a `Bun.SQL` Postgres connection
 * to the DI container.
 *
 * Use `PostgresModule.forRoot(opts)` at the application root to register the
 * connection pool. Use `PostgresModule.forFeature(repositories)` inside feature
 * modules to register repository classes.
 *
 * @example
 * @Module({
 *   imports: [
 *     PostgresModule.forRoot({ url: Bun.env.DATABASE_URL }),
 *     PostgresModule.forFeature([UserRepository]),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class PostgresModule {
  /**
   * Creates a root-level module that initialises a `Bun.SQL` Postgres pool and
   * registers it under the `POSTGRES_SQL` token.
   *
   * @example
   * PostgresModule.forRoot({ url: 'postgres://user:pass@localhost/mydb', max: 10 })
   */
  static forRoot(opts: PostgresOptions = {}) {
    @Module({
      providers: [
        {
          provide: POSTGRES_SQL,
          useFactory: () => {
            const url = opts.url ?? Bun.env.DATABASE_URL
            if (url) {
              return new Bun.SQL(url, { max: opts.max })
            }
            return new Bun.SQL({
              hostname: opts.hostname ?? 'localhost',
              database: opts.database ?? 'postgres',
              username: opts.user ?? 'postgres',
              password: opts.password ?? '',
              max: opts.max,
            })
          },
        },
      ],
      exports: [POSTGRES_SQL],
    })
    class PostgresRootModule {}

    return PostgresRootModule
  }

  /**
   * Creates a feature-level module that registers repository classes as
   * providers. Each repository class must be decorated with `@Repository`.
   *
   * @example
   * PostgresModule.forFeature([UserRepository, PostRepository])
   */
  static forFeature(repositories: (new (...args: unknown[]) => unknown)[]) {
    @Module({
      providers: repositories as {
        new (...args: unknown[]): unknown
      }[],
      exports: repositories as {
        new (...args: unknown[]): unknown
      }[],
    })
    class PostgresFeatureModule {}

    return PostgresFeatureModule
  }
}
