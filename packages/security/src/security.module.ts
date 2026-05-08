import { Module } from '@banhmi/common'
import type { CorsOptions } from './cors/cors.module'
import { CorsModule } from './cors/cors.module'
import type { CsrfOptions } from './csrf/csrf.module'
import { CsrfModule } from './csrf/csrf.module'
import type { HelmetOptions } from './helmet/helmet.module'
import { HelmetModule } from './helmet/helmet.module'

/**
 * Root configuration for {@link SecurityModule.forRoot}.
 *
 * Each sub-module (`helmet`, `cors`, `csrf`) is optional. When a key is
 * omitted the corresponding sub-module is not registered. Pass an empty
 * object `{}` to register a sub-module with its default options.
 *
 * @example
 * SecurityModule.forRoot({
 *   helmet: {},
 *   cors: { origin: 'https://app.example.com' },
 *   csrf: { cookie: { secure: true } },
 * })
 */
export type SecurityModuleOptions = {
  /**
   * Helmet options. Omit this key to skip the Helmet middleware entirely.
   */
  helmet?: HelmetOptions
  /**
   * CORS options. Omit this key to skip the CORS middleware entirely.
   */
  cors?: CorsOptions
  /**
   * CSRF options. Omit this key to skip the CSRF middleware entirely.
   */
  csrf?: CsrfOptions
}

/**
 * Convenience security module that wires Helmet, CORS, and CSRF protection
 * in a single import.
 *
 * Each sub-module is independently usable; `SecurityModule.forRoot` simply
 * combines them. Only sub-modules whose keys are present in `opts` are
 * registered.
 *
 * @example
 * import { SecurityModule } from '@banhmi/security'
 *
 * \@Module({
 *   imports: [
 *     SecurityModule.forRoot({
 *       helmet: {},
 *       cors: { origin: 'https://app.example.com', credentials: true },
 *       csrf: {},
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class SecurityModule {
  /**
   * Register the security sub-modules. Each key is optional — omit a key to
   * skip that sub-module.
   *
   * @param opts - Combined security options.
   * @returns A dynamically-created `@Module` that imports the configured
   *   sub-modules.
   *
   * @example
   * SecurityModule.forRoot({ helmet: {}, cors: { origin: '*' } })
   */
  static forRoot(opts: SecurityModuleOptions = {}) {
    const imports = []

    if (opts.helmet !== undefined) {
      imports.push(HelmetModule.forRoot(opts.helmet))
    }
    if (opts.cors !== undefined) {
      imports.push(CorsModule.forRoot(opts.cors))
    }
    if (opts.csrf !== undefined) {
      imports.push(CsrfModule.forRoot(opts.csrf))
    }

    @Module({ imports })
    class SecurityRootModule {}

    return SecurityRootModule
  }
}
