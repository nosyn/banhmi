import type { OnApplicationBootstrap } from '@banhmi/common'
import { Module } from '@banhmi/common'
import { registerEngine } from './registry'
import { VIEW_ENGINE_TOKEN } from './tokens'
import type { MvcOptions, ViewEngine } from './types'

/**
 * Bootstrap service that registers the view engine in the module-scope
 * registry so that `@Render` decorators can resolve it at invocation time.
 *
 * @internal
 */
class MvcBootstrapService implements OnApplicationBootstrap {
  static inject = [VIEW_ENGINE_TOKEN] as const

  constructor(private readonly engine: ViewEngine) {}

  onApplicationBootstrap(): void {
    registerEngine(this.engine)
  }
}

/**
 * Module that registers a view engine for use with the `@Render` decorator.
 *
 * Call {@link MvcModule.forRoot} with your chosen view engine to enable
 * server-side template rendering.
 *
 * @example
 * import { MvcModule, etaEngine } from '@banhmi/mvc'
 *
 * \@Module({ imports: [MvcModule.forRoot({ engine: etaEngine({ viewsDir: './views' }) })] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class MvcModule {
  /**
   * Create a configured MVC module that registers the view engine.
   *
   * @param opts - Options including the engine instance and optional view dirs.
   * @returns A dynamically-created `@Module`.
   *
   * @example
   * MvcModule.forRoot({ engine: etaEngine({ viewsDir: './views' }) })
   */
  static forRoot(opts: MvcOptions) {
    @Module({
      providers: [
        { provide: VIEW_ENGINE_TOKEN, useValue: opts.engine },
        MvcBootstrapService,
      ],
      exports: [VIEW_ENGINE_TOKEN],
    })
    class MvcRootModule {}

    return MvcRootModule
  }
}
