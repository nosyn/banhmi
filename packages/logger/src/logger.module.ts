import { Module } from '@banhmi/common'
import { Logger } from './logger'
import { LOGGER_OPTIONS, ROOT_LOGGER } from './tokens'
import { jsonTransport } from './transports/json'
import type { LoggerOptions } from './types'

/**
 * Logger module for Banhmi applications.
 *
 * Call {@link LoggerModule.forRoot} to register the {@link ROOT_LOGGER} and
 * {@link LOGGER_OPTIONS} DI tokens. The root logger defaults to `level: 'info'`
 * with {@link jsonTransport} when no options are provided.
 *
 * @example
 * import { LoggerModule } from '@banhmi/logger'
 *
 * \@Module({ imports: [LoggerModule.forRoot({ level: 'debug' })] })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class LoggerModule {
  /**
   * Create a configured logger module.
   *
   * @param opts - Logger configuration. `level` defaults to `'info'`,
   *   `transports` defaults to `[jsonTransport()]`.
   * @returns A dynamically-created `@Module` that registers
   *   {@link ROOT_LOGGER} and {@link LOGGER_OPTIONS} tokens.
   *
   * @example
   * LoggerModule.forRoot({ level: 'warn', base: { service: 'my-app' } })
   */
  static forRoot(opts: LoggerOptions = {}) {
    const resolvedOpts: Required<LoggerOptions> = {
      level: opts.level ?? 'info',
      transports: opts.transports ?? [jsonTransport()],
      base: opts.base ?? {},
    }

    @Module({
      providers: [
        { provide: LOGGER_OPTIONS, useValue: resolvedOpts },
        {
          provide: ROOT_LOGGER,
          useFactory: () => new Logger(resolvedOpts),
        },
      ],
      exports: [LOGGER_OPTIONS, ROOT_LOGGER],
    })
    class LoggerRootModule {}

    return LoggerRootModule
  }
}
