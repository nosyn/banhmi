/**
 * @banhmi/static — Bun-native static file serving for Banhmi applications.
 *
 * Import {@link StaticModule} and call `forRoot()` with a root directory.
 * Files are served zero-copy via `Bun.file()` with configurable
 * `Cache-Control` headers and path-traversal protection.
 *
 * @example
 * import { StaticModule } from '@banhmi/static'
 *
 * \@Module({ imports: [StaticModule.forRoot({ root: './public', prefix: '/assets' })] })
 * class AppModule {}
 */

export { ServeStaticInterceptor } from './serve-static.interceptor'
export type { StaticOptions } from './static.module'
export { StaticModule } from './static.module'
export { STATIC_OPTIONS } from './tokens'
