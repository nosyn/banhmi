import { afterEach, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { ConfigModule } from '../src/config.module'
import { ConfigService } from '../src/config.service'
import { CONFIG_TOKEN } from '../src/tokens'
import type { EnvSchema } from '../src/config.service'

const schema = {
  PORT: { type: 'number' as const, default: 3000 },
  DATABASE_URL: { type: 'string' as const },
  DEBUG: { type: 'boolean' as const, default: false },
} satisfies EnvSchema

describe('ConfigService', () => {
  test('reads and coerces env values', () => {
    const env = {
      PORT: '8080',
      DATABASE_URL: 'sqlite:./test.db',
      DEBUG: 'true',
    }
    const svc = new ConfigService(schema, env)
    expect(svc.get('PORT')).toBe(8080)
    expect(svc.get('DATABASE_URL')).toBe('sqlite:./test.db')
    expect(svc.get('DEBUG')).toBe(true)
  })

  test('uses default when env var is missing', () => {
    const env = { DATABASE_URL: 'sqlite:./test.db' }
    const svc = new ConfigService(schema, env)
    expect(svc.get('PORT')).toBe(3000)
    expect(svc.get('DEBUG')).toBe(false)
  })

  test('throws on missing required env var', () => {
    expect(() => new ConfigService(schema, {})).toThrow('DATABASE_URL')
  })

  test('coerces boolean "1" as true', () => {
    const svc = new ConfigService(schema, { DATABASE_URL: 'x', DEBUG: '1' })
    expect(svc.get('DEBUG')).toBe(true)
  })

  test('throws on invalid number', () => {
    expect(
      () =>
        new ConfigService(schema, { DATABASE_URL: 'x', PORT: 'not-a-number' }),
    ).toThrow('PORT')
  })
})

describe('ConfigModule.forRoot', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('registers ConfigService with parsed env', async () => {
    const testSchema = { PORT: { type: 'number' as const, default: 3000 } }

    @Module({ imports: [ConfigModule.forRoot(testSchema, { PORT: '9090' })] })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const cfg = app.container.resolve(CONFIG_TOKEN) as ConfigService<
      typeof testSchema
    >
    expect(cfg.get('PORT')).toBe(9090)
  })
})
