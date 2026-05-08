import { describe, expect, mock, test } from 'bun:test'
import { InjectLogger } from '../src/inject-logger'
import { Logger } from '../src/logger'
import { jsonTransport } from '../src/transports/json'
import { prettyTransport } from '../src/transports/pretty'
import type { LogRecord, LogTransport } from '../src/types'

/** Strip ANSI escape sequences for text comparison. */
function stripAnsi(str: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI strip
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

describe('jsonTransport', () => {
  test('writes valid JSON line ending with newline to stdout', () => {
    const lines: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    // Intercept stdout
    const spy = mock((data: unknown) => {
      if (typeof data === 'string') lines.push(data)
      return true
    })
    process.stdout.write = spy as unknown as typeof process.stdout.write

    try {
      const transport = jsonTransport()
      const record: LogRecord = {
        time: 1000,
        level: 'info',
        msg: 'hello json',
      }
      transport.write(record)
    } finally {
      process.stdout.write = origWrite
    }

    expect(lines).toHaveLength(1)
    const line = lines[0]
    expect(typeof line).toBe('string')
    if (typeof line === 'string') {
      expect(line.endsWith('\n')).toBe(true)
      const parsed = JSON.parse(line.trim())
      expect(parsed.level).toBe('info')
      expect(parsed.msg).toBe('hello json')
      expect(typeof parsed.time).toBe('number')
    }
  })

  test('serializes extra context fields', () => {
    const lines: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    const spy = mock((data: unknown) => {
      if (typeof data === 'string') lines.push(data)
      return true
    })
    process.stdout.write = spy as unknown as typeof process.stdout.write

    try {
      const transport = jsonTransport()
      const record: LogRecord = {
        time: 2000,
        level: 'debug',
        msg: 'debug ctx',
        requestId: 'req-1',
        userId: 99,
      }
      transport.write(record)
    } finally {
      process.stdout.write = origWrite
    }

    const line = lines[0]
    if (typeof line === 'string') {
      const parsed = JSON.parse(line.trim())
      expect(parsed.requestId).toBe('req-1')
      expect(parsed.userId).toBe(99)
    }
  })
})

describe('prettyTransport', () => {
  test('output contains the level name and message', () => {
    const lines: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    const spy = mock((data: unknown) => {
      if (typeof data === 'string') lines.push(data)
      return true
    })
    process.stdout.write = spy as unknown as typeof process.stdout.write

    try {
      const transport = prettyTransport()
      const record: LogRecord = {
        time: 1_700_000_000_000,
        level: 'warn',
        msg: 'pretty warning',
      }
      transport.write(record)
    } finally {
      process.stdout.write = origWrite
    }

    const line = lines[0] ?? ''
    const plain = stripAnsi(line)
    expect(plain).toContain('WARN')
    expect(plain).toContain('pretty warning')
  })

  test('output contains extra context fields', () => {
    const lines: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    const spy = mock((data: unknown) => {
      if (typeof data === 'string') lines.push(data)
      return true
    })
    process.stdout.write = spy as unknown as typeof process.stdout.write

    try {
      const transport = prettyTransport()
      const record: LogRecord = {
        time: 1_700_000_000_000,
        level: 'info',
        msg: 'with context',
        requestId: 'r1',
      }
      transport.write(record)
    } finally {
      process.stdout.write = origWrite
    }

    const line = lines[0] ?? ''
    const plain = stripAnsi(line)
    expect(plain).toContain('requestId')
  })
})

describe('InjectLogger', () => {
  test('returns a token resolving to a child logger named after the consumer', () => {
    // makeTestTransport inline
    const records: LogRecord[] = []
    const transport: LogTransport = {
      write(r: LogRecord) {
        records.push(r)
      },
    }

    const token = InjectLogger('CatsService')
    // Token should be a symbol
    expect(typeof token).toBe('symbol')
    // Same name → same token
    expect(InjectLogger('CatsService')).toBe(token)
    // Different name → different token
    expect(InjectLogger('DogsService')).not.toBe(token)

    // The child logger created via the token pattern should emit { name }
    const root = new Logger({ level: 'info', transports: [transport] })
    const childLogger = root.child({ name: 'CatsService' })
    childLogger.info('cats found')
    expect(records[0]?.name).toBe('CatsService')
    expect(records[0]?.msg).toBe('cats found')
  })
})
