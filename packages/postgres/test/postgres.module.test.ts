import { afterEach, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { POSTGRES_SQL, PostgresModule } from '../src/index'

describe('PostgresModule.forRoot', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('registers a Bun.SQL instance as POSTGRES_SQL', async () => {
    @Module({
      imports: [
        PostgresModule.forRoot({
          hostname: 'localhost',
          database: 'test',
          user: 'test',
          password: 'test',
        }),
      ],
    })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const sql = app.container.resolve(POSTGRES_SQL)
    // Bun.SQL returns a function (tagged template tag) — verify it is callable
    expect(typeof sql).toBe('function')
  })

  test('uses DATABASE_URL env var when url option is omitted', async () => {
    // Temporarily set env to a dummy URL so the factory does not error
    const original = Bun.env.DATABASE_URL
    Bun.env.DATABASE_URL = 'postgres://test:test@localhost/test'

    @Module({ imports: [PostgresModule.forRoot()] })
    class UrlAppModule {}

    app = await BanhmiFactory.create(UrlAppModule)
    const sql = app.container.resolve(POSTGRES_SQL)
    expect(typeof sql).toBe('function')

    // Restore
    if (original === undefined) {
      delete Bun.env.DATABASE_URL
    } else {
      Bun.env.DATABASE_URL = original
    }
  })

  test('exports POSTGRES_SQL so feature modules can resolve it', async () => {
    @Module({
      imports: [
        PostgresModule.forRoot({
          hostname: 'localhost',
          database: 'test',
          user: 'test',
          password: 'test',
        }),
      ],
    })
    class FeatureAppModule {}

    app = await BanhmiFactory.create(FeatureAppModule)
    expect(() => app?.container.resolve(POSTGRES_SQL)).not.toThrow()
  })
})
