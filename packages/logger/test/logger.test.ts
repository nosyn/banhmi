import { describe, expect, test } from 'bun:test'
import { Logger } from '../src/logger'
import type { LogRecord, LogTransport } from '../src/types'

/** In-memory test transport that collects records. */
function makeTestTransport() {
  const records: LogRecord[] = []
  const transport: LogTransport = {
    write(r: LogRecord) {
      records.push(r)
    },
  }
  return { records, transport }
}

describe('Logger', () => {
  test('level filtering: debug is dropped when level=info', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({ level: 'info', transports: [transport] })
    logger.debug('should be dropped')
    expect(records).toHaveLength(0)
  })

  test('level filtering: debug records when level=debug', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({ level: 'debug', transports: [transport] })
    logger.debug('debug message')
    expect(records).toHaveLength(1)
    expect(records[0]).toBeDefined()
    expect(records[0]?.level).toBe('debug')
    expect(records[0]?.msg).toBe('debug message')
  })

  test('level filtering: trace is dropped when level=debug', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({ level: 'debug', transports: [transport] })
    logger.trace('should be dropped')
    expect(records).toHaveLength(0)
  })

  test('level filtering: fatal always emits', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({ level: 'fatal', transports: [transport] })
    logger.fatal('fatal event')
    expect(records).toHaveLength(1)
    expect(records[0]?.level).toBe('fatal')
  })

  test('all level methods emit correct level field', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({ level: 'trace', transports: [transport] })
    logger.fatal('a')
    logger.error('b')
    logger.warn('c')
    logger.info('d')
    logger.debug('e')
    logger.trace('f')
    const levels = records.map((r) => r.level)
    expect(levels).toEqual(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
  })

  test('record includes time as number', () => {
    const { records, transport } = makeTestTransport()
    const before = Date.now()
    const logger = new Logger({ level: 'info', transports: [transport] })
    logger.info('time test')
    const after = Date.now()
    const time = records[0]?.time
    expect(typeof time).toBe('number')
    expect(time).toBeGreaterThanOrEqual(before)
    expect(time).toBeLessThanOrEqual(after)
  })

  test('per-call context is merged onto the record', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({ level: 'info', transports: [transport] })
    logger.info('event', { userId: 42 })
    expect(records[0]?.userId).toBe(42)
  })

  test('base options are on every record', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({
      level: 'info',
      transports: [transport],
      base: { service: 'demo' },
    })
    logger.info('msg1')
    logger.info('msg2')
    expect(records[0]?.service).toBe('demo')
    expect(records[1]?.service).toBe('demo')
  })

  test('child adds context to subsequent records', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({ level: 'info', transports: [transport] })
    const child = logger.child({ requestId: 'abc-123' })
    child.info('child log')
    expect(records[0]?.requestId).toBe('abc-123')
    expect(records[0]?.msg).toBe('child log')
  })

  test('child inherits parent base context', () => {
    const { records, transport } = makeTestTransport()
    const logger = new Logger({
      level: 'info',
      transports: [transport],
      base: { service: 'demo' },
    })
    const child = logger.child({ requestId: 'xyz' })
    child.info('child with base')
    expect(records[0]?.service).toBe('demo')
    expect(records[0]?.requestId).toBe('xyz')
  })

  test('multiple transports each receive the same record', () => {
    const t1 = makeTestTransport()
    const t2 = makeTestTransport()
    const logger = new Logger({
      level: 'info',
      transports: [t1.transport, t2.transport],
    })
    logger.info('broadcast')
    expect(t1.records).toHaveLength(1)
    expect(t2.records).toHaveLength(1)
    expect(t1.records[0]?.msg).toBe('broadcast')
    expect(t2.records[0]?.msg).toBe('broadcast')
  })

  test('transport errors are swallowed', () => {
    const brokenTransport: LogTransport = {
      write() {
        throw new Error('transport failure')
      },
    }
    const logger = new Logger({ level: 'info', transports: [brokenTransport] })
    // Should not throw
    expect(() => logger.info('test')).not.toThrow()
  })

  test('async transport errors are swallowed', async () => {
    const asyncBroken: LogTransport = {
      write() {
        return Promise.reject(new Error('async failure'))
      },
    }
    const logger = new Logger({ level: 'info', transports: [asyncBroken] })
    // Should not throw synchronously
    expect(() => logger.info('test')).not.toThrow()
    // Give microtasks a tick to settle
    await Promise.resolve()
  })
})
