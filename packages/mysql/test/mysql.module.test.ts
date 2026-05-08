import { afterEach, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { MYSQL_SQL, MysqlModule } from '../src/index'

describe('MysqlModule.forRoot', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('registers a Bun.SQL instance as MYSQL_SQL', async () => {
    @Module({
      imports: [
        MysqlModule.forRoot({
          hostname: 'localhost',
          database: 'test',
          user: 'root',
          password: 'test',
        }),
      ],
    })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const sql = app.container.resolve(MYSQL_SQL)
    // Bun.SQL with mysql adapter returns a function (tagged template tag)
    expect(typeof sql).toBe('function')
  })

  test('uses MYSQL_URL env var when url option is omitted', async () => {
    const original = Bun.env.MYSQL_URL
    Bun.env.MYSQL_URL = 'mysql://root:test@localhost/test'

    @Module({ imports: [MysqlModule.forRoot()] })
    class UrlAppModule {}

    app = await BanhmiFactory.create(UrlAppModule)
    const sql = app.container.resolve(MYSQL_SQL)
    expect(typeof sql).toBe('function')

    if (original === undefined) {
      delete Bun.env.MYSQL_URL
    } else {
      Bun.env.MYSQL_URL = original
    }
  })

  test('exports MYSQL_SQL so feature modules can resolve it', async () => {
    @Module({
      imports: [
        MysqlModule.forRoot({
          hostname: 'localhost',
          database: 'test',
          user: 'root',
          password: 'test',
        }),
      ],
    })
    class FeatureAppModule {}

    app = await BanhmiFactory.create(FeatureAppModule)
    expect(() => app?.container.resolve(MYSQL_SQL)).not.toThrow()
  })
})
