import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { MYSQL_SQL } from '@banhmi/mysql'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './index'

describe('mysql feature: module registration', () => {
  let app: BanhmiApplication

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
  })

  afterAll(async () => {
    await app.close()
  })

  test('MYSQL_SQL token is registered in the container', () => {
    const sql = app.container.resolve(MYSQL_SQL)
    // Bun.SQL with mysql adapter returns a function (tagged template tag)
    expect(typeof sql).toBe('function')
  })
})

const RUN_INTEGRATION = Boolean(Bun.env.MYSQL_URL)

describe.if(RUN_INTEGRATION)(
  'mysql feature: HTTP integration (MYSQL_URL required)',
  () => {
    let app: BanhmiApplication
    let base: string

    beforeAll(async () => {
      app = await BanhmiFactory.create(AppModule)
      await app.listen(0)
      base = app.getUrl()

      const sql = app.container.resolve(MYSQL_SQL)
      await sql`
        CREATE TABLE IF NOT EXISTS products (
          id    INT AUTO_INCREMENT PRIMARY KEY,
          name  VARCHAR(255) NOT NULL,
          price DECIMAL(10,2) NOT NULL
        )
      `
      await sql`TRUNCATE TABLE products`
    })

    afterAll(async () => {
      const sql = app.container.resolve(MYSQL_SQL)
      await sql`DROP TABLE IF EXISTS products`
      await app.close()
    })

    test('POST /products creates a product', async () => {
      const res = await fetch(`${base}/products`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Widget', price: 9.99 }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { id: number; name: string }
      expect(body.name).toBe('Widget')
    })

    test('GET /products returns list', async () => {
      const res = await fetch(`${base}/products`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as unknown[]
      expect(Array.isArray(body)).toBe(true)
    })

    test('GET /products/:id returns product or not-found', async () => {
      const res = await fetch(`${base}/products/1`)
      expect(res.status).toBe(200)
    })
  },
)

describe.if(!RUN_INTEGRATION)(
  'mysql feature: HTTP integration (skipped: MYSQL_URL not set)',
  () => {
    test('set MYSQL_URL to run HTTP integration tests', () => {
      expect(true).toBe(true)
    })
  },
)
