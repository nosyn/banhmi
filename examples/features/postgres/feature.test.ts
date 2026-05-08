import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { POSTGRES_SQL } from '@banhmi/postgres'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './index'

describe('postgres feature: module registration', () => {
  let app: BanhmiApplication

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
  })

  afterAll(async () => {
    await app.close()
  })

  test('POSTGRES_SQL token is registered in the container', () => {
    const sql = app.container.resolve(POSTGRES_SQL)
    // Bun.SQL returns a tagged-template function
    expect(typeof sql).toBe('function')
  })
})

const RUN_INTEGRATION = Boolean(Bun.env.DATABASE_URL)

describe.if(RUN_INTEGRATION)(
  'postgres feature: HTTP integration (DATABASE_URL required)',
  () => {
    let app: BanhmiApplication
    let base: string

    beforeAll(async () => {
      app = await BanhmiFactory.create(AppModule)
      await app.listen(0)
      base = app.getUrl()

      // Ensure table exists
      const sql = app.container.resolve(POSTGRES_SQL)
      await sql`
      CREATE TABLE IF NOT EXISTS users (
        id    SERIAL PRIMARY KEY,
        name  TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `
      await sql`TRUNCATE users RESTART IDENTITY`
    })

    afterAll(async () => {
      const sql = app.container.resolve(POSTGRES_SQL)
      await sql`DROP TABLE IF EXISTS users`
      await app.close()
    })

    test('POST /users creates a user', async () => {
      const res = await fetch(`${base}/users`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { id: number; name: string }
      expect(body.name).toBe('Alice')
    })

    test('GET /users returns list', async () => {
      const res = await fetch(`${base}/users`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as unknown[]
      expect(Array.isArray(body)).toBe(true)
    })

    test('GET /users/:id returns user or not-found', async () => {
      const res = await fetch(`${base}/users/1`)
      expect(res.status).toBe(200)
    })
  },
)

describe.if(!RUN_INTEGRATION)(
  'postgres feature: HTTP integration (skipped: DATABASE_URL not set)',
  () => {
    test('set DATABASE_URL to run HTTP integration tests', () => {
      expect(true).toBe(true)
    })
  },
)
