import type { LogRecord, LogTransport } from '../types'

/**
 * Creates a transport that writes newline-delimited JSON records to
 * `process.stdout`.
 *
 * Each record is serialized as a single JSON object followed by `\n`,
 * conforming to the NDJSON format.
 *
 * @returns A {@link LogTransport} writing NDJSON to stdout.
 *
 * @example
 * import { Logger, jsonTransport } from '@banhmi/logger'
 *
 * const logger = new Logger({ transports: [jsonTransport()] })
 * logger.info('hello')
 * // stdout: {"time":1234567890,"level":"info","msg":"hello"}\n
 */
export function jsonTransport(): LogTransport {
  return {
    write(record: LogRecord): void {
      process.stdout.write(`${JSON.stringify(record)}\n`)
    },
  }
}
