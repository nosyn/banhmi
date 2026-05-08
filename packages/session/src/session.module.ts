import { Module } from '@banhmi/common'
import { MemorySessionStore } from './stores/memory'
import { SESSION_OPTIONS } from './tokens'
import type { SessionOptions } from './types'

/**
 * Server-side session module.
 *
 * Call {@link SessionModule.forRoot} to register {@link SESSION_OPTIONS}
 * in the DI container. The registered options are used as defaults by
 * the `@Session()` decorator.
 *
 * @example
 * \@Module({
 *   imports: [
 *     SessionModule.forRoot({
 *       secret: 'my-signing-secret',
 *       cookie: { maxAge: 3600, secure: true },
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class SessionModule {
  /**
   * Register session configuration globally.
   *
   * If `store` is not provided in `opts`, an in-memory
   * {@link MemorySessionStore} is used automatically.
   *
   * @param opts - Session options including `secret` (required).
   * @returns A dynamically-created `@Module` that provides
   *   the {@link SESSION_OPTIONS} token.
   *
   * @example
   * SessionModule.forRoot({ secret: 'my-secret', cookie: { maxAge: 7200 } })
   */
  static forRoot(opts: SessionOptions) {
    const resolvedOpts: SessionOptions = {
      ...opts,
      store: opts.store ?? new MemorySessionStore(),
    }

    @Module({
      providers: [
        {
          provide: SESSION_OPTIONS,
          useValue: resolvedOpts,
        },
      ],
      exports: [SESSION_OPTIONS],
    })
    class SessionRootModule {}

    return SessionRootModule
  }
}
