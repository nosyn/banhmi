import type { OnApplicationBootstrap } from '@banhmi/common'
import { Module } from '@banhmi/common'
import type { Container, HttpAdapter, ModuleNode } from '@banhmi/core'
import {
  CONTAINER_TOKEN,
  HTTP_ADAPTER_TOKEN,
  MODULE_TREE_TOKEN,
} from '@banhmi/platform-bun'
import { installDevtoolsMiddleware } from './devtools.middleware'
import { ProfileRecorder } from './profile/recorder'
import { DEVTOOLS_OPTIONS, PROFILE_RECORDER } from './tokens'
import type { DevtoolsOptions } from './types'

/**
 * Bootstrap service that mounts devtools middleware on the HTTP adapter after
 * the application has started listening.
 *
 * @internal
 */
class DevtoolsBootstrapService implements OnApplicationBootstrap {
  static inject = [
    HTTP_ADAPTER_TOKEN,
    CONTAINER_TOKEN,
    MODULE_TREE_TOKEN,
    PROFILE_RECORDER,
    DEVTOOLS_OPTIONS,
  ] as const

  constructor(
    private readonly adapter: HttpAdapter,
    private readonly container: Container,
    private readonly moduleTree: ModuleNode,
    private readonly recorder: ProfileRecorder,
    private readonly opts: DevtoolsOptions,
  ) {}

  /**
   * Mount all devtools routes via the adapter's `use()` middleware hook.
   */
  onApplicationBootstrap(): void {
    const enabled = this.opts.enabled ?? Bun.env.NODE_ENV !== 'production'
    if (!enabled) return

    installDevtoolsMiddleware(
      this.adapter,
      this.container,
      this.moduleTree,
      this.recorder,
      this.opts,
    )
  }
}

/**
 * Drop-in devtools module that exposes a DI-graph inspector and request
 * profiler at `/__banhmi/devtools` (configurable).
 *
 * **Only mounts when `enabled` is `true`** (defaults to non-production
 * environments). Do not import in production without setting `enabled: false`.
 *
 * @example
 * import { Module } from 'banhmi'
 * import { DevtoolsModule } from '@banhmi/devtools'
 *
 * \@Module({ imports: [DevtoolsModule.forRoot()] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class DevtoolsModule {
  /**
   * Create a configured devtools module.
   *
   * @param opts - {@link DevtoolsOptions} — all fields are optional.
   *
   * @example
   * DevtoolsModule.forRoot({ path: '/_dev', profileSize: 50 })
   */
  static forRoot(opts: DevtoolsOptions = {}) {
    const capacity = opts.profileSize ?? 100

    @Module({
      providers: [
        { provide: DEVTOOLS_OPTIONS, useValue: opts },
        {
          provide: PROFILE_RECORDER,
          useFactory: () => new ProfileRecorder(capacity),
        },
        DevtoolsBootstrapService,
      ],
      exports: [DEVTOOLS_OPTIONS, PROFILE_RECORDER],
    })
    class DevtoolsRootModule {}

    return DevtoolsRootModule
  }
}
