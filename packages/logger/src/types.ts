/**
 * Log severity levels ordered from most to least severe.
 *
 * @example
 * const level: LogLevel = 'info'
 */
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

/**
 * A single structured log record emitted by a {@link Logger}.
 *
 * The `time` field is a Unix epoch in milliseconds. `level` and `msg` are
 * always present; any extra keys come from the logger's `base`, the child
 * context, or per-call context merged at log time.
 *
 * @example
 * const record: LogRecord = { time: Date.now(), level: 'info', msg: 'started' }
 */
export type LogRecord = {
  time: number
  level: LogLevel
  msg: string
  [k: string]: unknown
}

/**
 * A destination that receives {@link LogRecord}s from a {@link Logger}.
 *
 * Both synchronous and asynchronous `write` implementations are supported.
 * Errors thrown by a transport are swallowed to protect the application.
 *
 * @example
 * const myTransport: LogTransport = {
 *   write(record) { console.log(record.msg) },
 * }
 */
export interface LogTransport {
  write(record: LogRecord): void | Promise<void>
}

/**
 * Configuration options passed to {@link Logger} or
 * {@link LoggerModule.forRoot}.
 *
 * @example
 * const opts: LoggerOptions = {
 *   level: 'debug',
 *   base: { service: 'api' },
 * }
 */
export type LoggerOptions = {
  /**
   * Minimum severity level to emit. Records below this level are dropped.
   * Defaults to `'info'`.
   */
  level?: LogLevel
  /**
   * One or more transport implementations. Defaults to `[jsonTransport()]`.
   */
  transports?: LogTransport[]
  /**
   * Key/value pairs merged into every record emitted by this logger and its
   * children (e.g. `{ service: 'cats-api', version: '1.0.0' }`).
   */
  base?: Record<string, unknown>
}
