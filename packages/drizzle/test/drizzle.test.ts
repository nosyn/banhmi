import { afterEach, describe, expect, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { DRIZZLE_DB, DrizzleModule, sqliteDriver } from '../src/index'

describe('DrizzleModule.forRoot', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('registers a drizzle db instance as DRIZZLE_DB', async () => {
    @Module({
      imports: [
        DrizzleModule.forRoot({
          driver: sqliteDriver({ filename: ':memory:' }),
        }),
      ],
    })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const db = app.container.resolve(DRIZZLE_DB)
    expect(db).toBeDefined()
    expect(typeof db).toBe('object')
  })

  test('DRIZZLE_DB is exported and resolvable from the container', async () => {
    @Module({
      imports: [
        DrizzleModule.forRoot({
          driver: sqliteDriver({ filename: ':memory:' }),
        }),
      ],
    })
    class AppModule2 {}

    app = await BanhmiFactory.create(AppModule2)
    expect(() => app?.container.resolve(DRIZZLE_DB)).not.toThrow()
  })

  test('forRoot accepts a schema option', async () => {
    @Module({
      imports: [
        DrizzleModule.forRoot({
          driver: sqliteDriver({ filename: ':memory:' }),
          schema: {},
        }),
      ],
    })
    class AppModuleWithSchema {}

    app = await BanhmiFactory.create(AppModuleWithSchema)
    const db = app.container.resolve(DRIZZLE_DB)
    expect(db).toBeDefined()
  })
})
