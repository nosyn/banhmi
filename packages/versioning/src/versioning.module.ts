import type { OnApplicationBootstrap } from '@banhmi/common'
import { Module } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import { HTTP_ADAPTER_TOKEN } from '@banhmi/platform-bun'
import { VERSIONING_OPTIONS } from './tokens'

/**
 * Versioning strategy configuration.
 *
 * Three strategies are supported:
 *
 * - **`uri`** — version is embedded in the URL path segment (e.g. `/v1/cats`).
 * - **`header`** — version is read from a custom request header.
 * - **`media-type`** — version is parsed from the `Accept` header vendor MIME
 *   type (e.g. `application/vnd.myapi.v2+json`).
 *
 * @example
 * // URI strategy with default prefix 'v'
 * const opts: VersioningOptions = { type: 'uri' }
 *
 * // Header strategy
 * const opts: VersioningOptions = { type: 'header', header: 'X-API-Version' }
 *
 * // Media-type strategy
 * const opts: VersioningOptions = { type: 'media-type', key: 'myapi' }
 */
export type VersioningOptions =
  | { type: 'uri'; prefix?: string; defaultVersion?: string }
  | { type: 'header'; header: string; defaultVersion?: string }
  | { type: 'media-type'; key: string; defaultVersion?: string }

/**
 * Installs versioning options on the HTTP adapter at bootstrap so the router
 * can consult them during route matching.
 *
 * Registered automatically by {@link VersioningModule.forRoot}.
 */
class VersioningBootstrapper implements OnApplicationBootstrap {
  static inject = [VERSIONING_OPTIONS, HTTP_ADAPTER_TOKEN] as const

  constructor(
    private readonly opts: VersioningOptions,
    private readonly adapter: HttpAdapter,
  ) {}

  onApplicationBootstrap(): void {
    // Install the versioning options on the adapter if supported
    const adapterWithVersioning = this.adapter as HttpAdapter & {
      setVersioningOptions?: (opts: VersioningOptions) => void
    }
    adapterWithVersioning.setVersioningOptions?.(this.opts)
  }
}

/**
 * API versioning module for Banhmi.
 *
 * Supports URI path (`/v1/cats`), custom header, and `Accept` media-type
 * versioning strategies. After enabling versioning, controllers and handlers
 * decorated with `@Version` will only match requests carrying the declared
 * version; unversioned handlers always match.
 *
 * @example
 * import { VersioningModule } from '@banhmi/versioning'
 *
 * \@Module({ imports: [VersioningModule.forRoot({ type: 'uri', prefix: 'v' })] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class VersioningModule {
  /**
   * Create a configured versioning module that can be imported into any
   * Banhmi `@Module`.
   *
   * @param opts - Versioning strategy options. `type` is required.
   * @returns A dynamically-created `@Module` class that registers the
   *   versioning bootstrapper and the {@link VERSIONING_OPTIONS} token.
   *
   * @example
   * VersioningModule.forRoot({ type: 'header', header: 'X-API-Version' })
   */
  static forRoot(opts: VersioningOptions) {
    @Module({
      providers: [
        { provide: VERSIONING_OPTIONS, useValue: opts },
        VersioningBootstrapper,
      ],
    })
    class VersioningRootModule {}

    return VersioningRootModule
  }
}
