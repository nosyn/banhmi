import type { LoggerOptions, LogLevel, LogRecord, LogTransport } from './types'

/** Numeric priority of each level — higher means more severe. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
}

/**
 * Structured logger with level filtering, child contexts, and pluggable
 * transports.
 *
 * Create instances via `new Logger(opts)` directly or via
 * {@link LoggerModule.forRoot} for framework-managed DI.
 *
 * @example
 * import { Logger, jsonTransport } from '@banhmi/logger'
 *
 * const logger = new Logger({ level: 'debug', transports: [jsonTransport()] })
 * logger.info('server started', { port: 3000 })
 */
export class Logger {
  private readonly level: LogLevel
  private readonly transports: LogTransport[]
  private readonly context: Record<string, unknown>

  constructor(opts: LoggerOptions = {}) {
    this.level = opts.level ?? 'info'
    this.transports = opts.transports ?? []
    this.context = opts.base ?? {}
  }

  /**
   * Create a child logger that inherits this logger's level and transports
   * but merges additional context fields onto every record it emits.
   *
   * @param context - Extra key/value pairs to attach to every child record.
   * @returns A new {@link Logger} sharing the same transports and level.
   *
   * @example
   * const childLogger = logger.child({ requestId: 'abc-123' })
   * childLogger.info('handling request')
   * // → { time: …, level: 'info', msg: 'handling request', requestId: 'abc-123' }
   */
  child(context: Record<string, unknown>): Logger {
    const child = new Logger({
      level: this.level,
      transports: this.transports,
    })
    // Override context directly so we avoid redundant opts processing
    ;(child as unknown as { context: Record<string, unknown> }).context = {
      ...this.context,
      ...context,
    }
    return child
  }

  /**
   * Emit a `fatal` record. Use for unrecoverable errors that require
   * immediate shutdown.
   *
   * @param msg - Human-readable message.
   * @param ctx - Optional extra fields merged into the record.
   *
   * @example
   * logger.fatal('out of memory', { pid: process.pid })
   */
  fatal(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('fatal', msg, ctx)
  }

  /**
   * Emit an `error` record.
   *
   * @param msg - Human-readable message.
   * @param ctx - Optional extra fields merged into the record.
   *
   * @example
   * logger.error('database connection failed', { url: dbUrl })
   */
  error(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('error', msg, ctx)
  }

  /**
   * Emit a `warn` record.
   *
   * @param msg - Human-readable message.
   * @param ctx - Optional extra fields merged into the record.
   *
   * @example
   * logger.warn('deprecated endpoint called', { path: '/old' })
   */
  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('warn', msg, ctx)
  }

  /**
   * Emit an `info` record.
   *
   * @param msg - Human-readable message.
   * @param ctx - Optional extra fields merged into the record.
   *
   * @example
   * logger.info('server listening', { port: 3000 })
   */
  info(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('info', msg, ctx)
  }

  /**
   * Emit a `debug` record.
   *
   * @param msg - Human-readable message.
   * @param ctx - Optional extra fields merged into the record.
   *
   * @example
   * logger.debug('cache miss', { key: 'users:1' })
   */
  debug(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('debug', msg, ctx)
  }

  /**
   * Emit a `trace` record.
   *
   * @param msg - Human-readable message.
   * @param ctx - Optional extra fields merged into the record.
   *
   * @example
   * logger.trace('entering function', { fn: 'handleRequest' })
   */
  trace(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('trace', msg, ctx)
  }

  private emit(
    level: LogLevel,
    msg: string,
    ctx?: Record<string, unknown>,
  ): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) return

    const record: LogRecord = {
      ...this.context,
      ...(ctx ?? {}),
      time: Date.now(),
      level,
      msg,
    }

    for (const transport of this.transports) {
      try {
        const result = transport.write(record)
        if (result instanceof Promise) {
          result.catch(() => {
            // swallow async transport errors
          })
        }
      } catch {
        // swallow sync transport errors
      }
    }
  }
}
