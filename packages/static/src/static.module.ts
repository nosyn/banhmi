import { Module } from '@banhmi/common'
import { ServeStaticInterceptor } from './serve-static.interceptor'
import { STATIC_OPTIONS } from './tokens'

/**
 * Configuration options for {@link StaticModule.forRoot}.
 *
 * @example
 * StaticModule.forRoot({
 *   root: './public',
 *   prefix: '/static',
 *   maxAge: 3600,
 *   immutable: true,
 * })
 */
export type StaticOptions = {
  /** Filesystem path to serve files from. Resolved against `process.cwd()`. */
  root: string
  /** URL prefix to match; defaults to `'/'`. */
  prefix?: string
  /** `Cache-Control` max-age in seconds; default `86400` (24 h). */
  maxAge?: number
  /** When `true`, appends `immutable` to `Cache-Control`. Default `false`. */
  immutable?: boolean
  /**
   * When `true` (default), a missing file lets the request fall through to
   * the next handler. When `false`, a missing file returns 404 immediately.
   */
  fallthrough?: boolean
  /**
   * Index file served when the request path ends with `'/'`.
   * Set to `false` to disable index resolution. Default `'index.html'`.
   */
  index?: string | false
}

/**
 * Bun-native static file serving module.
 *
 * Call {@link StaticModule.forRoot} with a root directory and optional
 * configuration to register a zero-copy static file server backed by
 * `Bun.file()`. The middleware is installed on the HTTP adapter automatically
 * at application bootstrap — no manual `app.use()` call is needed.
 *
 * @example
 * import { StaticModule } from '@banhmi/static'
 *
 * \@Module({ imports: [StaticModule.forRoot({ root: './public', prefix: '/assets' })] })
 * class AppModule {}
 *
 * const app = await BanhmiFactory.create(AppModule)
 * await app.listen(3000)
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class StaticModule {
  /**
   * Create a configured static-serving module that can be imported into any
   * Banhmi `@Module`.
   *
   * @param opts - Static serving options. `root` is required; all others are
   *   optional with sensible defaults.
   * @returns A dynamically-created `@Module` class that registers
   *   {@link ServeStaticInterceptor} and the {@link STATIC_OPTIONS} token.
   *
   * @example
   * StaticModule.forRoot({ root: './public', prefix: '/static' })
   */
  static forRoot(opts: StaticOptions) {
    @Module({
      providers: [
        {
          provide: STATIC_OPTIONS,
          useValue: opts,
        },
        ServeStaticInterceptor,
      ],
    })
    class StaticRootModule {}

    return StaticRootModule
  }
}
