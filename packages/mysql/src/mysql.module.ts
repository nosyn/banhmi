import { Module } from '@banhmi/common'
import { MYSQL_SQL } from './tokens'
import type { MysqlOptions } from './types'

/**
 * NestJS-style dynamic module that provides a `Bun.SQL` MySQL connection to
 * the DI container.
 *
 * Backed by `Bun.SQL` with `adapter: 'mysql'` — natively supported in
 * Bun ≥ 1.2. No external npm packages are required.
 *
 * Use `MysqlModule.forRoot(opts)` at the application root to register the
 * connection pool. Use `MysqlModule.forFeature(repositories)` inside feature
 * modules to register repository classes.
 *
 * @example
 * @Module({
 *   imports: [
 *     MysqlModule.forRoot({ url: Bun.env.MYSQL_URL }),
 *     MysqlModule.forFeature([ProductRepository]),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class MysqlModule {
  /**
   * Creates a root-level module that initialises a `Bun.SQL` MySQL pool and
   * registers it under the `MYSQL_SQL` token.
   *
   * @example
   * MysqlModule.forRoot({ url: 'mysql://user:pass@localhost/mydb', max: 10 })
   */
  static forRoot(opts: MysqlOptions = {}) {
    @Module({
      providers: [
        {
          provide: MYSQL_SQL,
          useFactory: () => {
            const url = opts.url ?? Bun.env.MYSQL_URL
            if (url) {
              return new Bun.SQL(url, { max: opts.max, adapter: 'mysql' })
            }
            return new Bun.SQL({
              hostname: opts.hostname ?? 'localhost',
              database: opts.database ?? 'mysql',
              username: opts.user ?? 'root',
              password: opts.password ?? '',
              max: opts.max,
              adapter: 'mysql',
            })
          },
        },
      ],
      exports: [MYSQL_SQL],
    })
    class MysqlRootModule {}

    return MysqlRootModule
  }

  /**
   * Creates a feature-level module that registers repository classes as
   * providers. Each repository class must be decorated with `@Repository`.
   *
   * @example
   * MysqlModule.forFeature([ProductRepository, OrderRepository])
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
    class MysqlFeatureModule {}

    return MysqlFeatureModule
  }
}
