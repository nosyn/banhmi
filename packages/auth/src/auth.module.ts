import { Module } from '@banhmi/common'
import type { Strategy } from './strategy'
import { AUTH_STRATEGIES } from './tokens'
import type { AuthOptions } from './types'

/**
 * Authentication module. Register once at the root level with your strategy
 * instances. The `AUTH_STRATEGIES` token is then available for injection.
 *
 * @example
 * \@Module({
 *   imports: [
 *     AuthModule.register({
 *       strategies: [
 *         new LocalStrategy({ validate: async ({ username, password }) => ... }),
 *         new JwtStrategy({ secret: 'my-secret' }),
 *       ],
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class AuthModule {
  /**
   * Create a configured auth module.
   *
   * @param opts - Authentication options. `strategies` is a list of
   *   {@link Strategy} instances to register.
   * @returns A dynamically-created `@Module` that registers all strategies
   *   under the `AUTH_STRATEGIES` token.
   *
   * @example
   * AuthModule.register({ strategies: [new JwtStrategy({ secret: 'secret' })] })
   */
  static register(opts: AuthOptions) {
    const strategyList: Strategy[] = opts.strategies

    @Module({
      providers: [{ provide: AUTH_STRATEGIES, useValue: strategyList }],
      exports: [AUTH_STRATEGIES],
    })
    class AuthRootModule {}

    return AuthRootModule
  }
}
