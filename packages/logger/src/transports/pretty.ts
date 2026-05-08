import type { LogLevel, LogRecord, LogTransport } from '../types'

/** ANSI color codes for each log level. */
const LEVEL_COLORS: Record<LogLevel, string> = {
  fatal: '\x1b[35m', // magenta
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[36m', // cyan
  debug: '\x1b[32m', // green
  trace: '\x1b[90m', // grey
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'

/**
 * Creates a transport that writes human-readable, ANSI-colored log lines
 * to `process.stdout`.
 *
 * Output format: `HH:MM:SS.mmm [LEVEL] message  key=value …`
 *
 * Level labels are upper-cased and color-coded. Extra context fields are
 * appended as `key=value` pairs separated by spaces.
 *
 * @returns A {@link LogTransport} writing formatted lines to stdout.
 *
 * @example
 * import { Logger, prettyTransport } from '@banhmi/logger'
 *
 * const logger = new Logger({ transports: [prettyTransport()] })
 * logger.info('server started', { port: 3000 })
 * // stdout: 12:34:56.789 [INFO]  server started  port=3000
 */
export function prettyTransport(): LogTransport {
  return {
    write(record: LogRecord): void {
      const { time, level, msg, ...rest } = record
      const date = new Date(time as number)
      const hh = String(date.getHours()).padStart(2, '0')
      const mm = String(date.getMinutes()).padStart(2, '0')
      const ss = String(date.getSeconds()).padStart(2, '0')
      const ms = String(date.getMilliseconds()).padStart(3, '0')
      const timestamp = `${hh}:${mm}:${ss}.${ms}`
      const color = LEVEL_COLORS[level as LogLevel] ?? ''
      const label = (level as string).toUpperCase().padEnd(5)

      const extras = Object.entries(rest)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ')

      const extrasStr = extras ? `  ${DIM}${extras}${RESET}` : ''
      const line = `${DIM}${timestamp}${RESET} ${color}[${label}]${RESET} ${msg}${extrasStr}\n`
      process.stdout.write(line)
    },
  }
}
