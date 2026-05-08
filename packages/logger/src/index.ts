/**
 * @banhmi/logger — Structured logging with JSON and pretty transports.
 *
 * Provides a level-filtered {@link Logger} class, pluggable {@link LogTransport}
 * implementations, a {@link LoggerModule} for framework-managed DI, and the
 * {@link InjectLogger} helper for requesting named child loggers via
 * `static inject = [...]`.
 *
 * @example
 * import { LoggerModule } from '@banhmi/logger'
 *
 * \@Module({ imports: [LoggerModule.forRoot({ level: 'info' })] })
 * class AppModule {}
 */

export { createChildLoggerProvider, InjectLogger } from './inject-logger'
export { Logger } from './logger'
export { LoggerModule } from './logger.module'
export { LOGGER_OPTIONS, ROOT_LOGGER } from './tokens'
export { jsonTransport, prettyTransport } from './transports'
export type { LoggerOptions, LogLevel, LogRecord, LogTransport } from './types'
