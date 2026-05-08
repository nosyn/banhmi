/**
 * Integration tests for drizzle-api example.
 *
 * Default suite: drizzle mode — in-memory SQLite, always runs.
 * postgres-raw suite: gated on DATABASE_URL being set.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { AppModule } from '../src/app.module'

// ─── Drizzle mode (default) ───────────────────────────────────────────────────

describe('drizzle-api: drizzle mode (SQLite in-memory)', () => {
  let app: BanhmiApplication
  let base: string

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
    await app.listen(0)
    base = app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  test('GET /users returns empty array initially', async () => {
    const res = await fetch(`${base}/users`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('POST /users creates a user', async () => {
    const res = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      id: number
      name: string
      email: string
    }
    expect(body.name).toBe('Alice')
    expect(body.email).toBe('alice@example.com')
    expect(typeof body.id).toBe('number')
  })

  test('GET /users/:id returns the created user', async () => {
    const createRes = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Bob', email: 'bob@example.com' }),
    })
    const created = (await createRes.json()) as { id: number }

    const res = await fetch(`${base}/users/${created.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { name: string }
    expect(body.name).toBe('Bob')
  })

  test('POST /posts creates a post under a user', async () => {
    const userRes = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Carol', email: 'carol@example.com' }),
    })
    const user = (await userRes.json()) as { id: number }

    const postRes = await fetch(`${base}/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Hello',
        body: 'World',
        authorId: user.id,
      }),
    })
    expect(postRes.status).toBe(201)
    const post = (await postRes.json()) as { title: string; authorId: number }
    expect(post.title).toBe('Hello')
    expect(post.authorId).toBe(user.id)
  })

  test('GET /posts returns array', async () => {
    const res = await fetch(`${base}/posts`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('DELETE /users/:id removes the user', async () => {
    const createRes = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Dave', email: 'dave@example.com' }),
    })
    const created = (await createRes.json()) as { id: number }

    const del = await fetch(`${base}/users/${created.id}`, { method: 'DELETE' })
    expect(del.status).toBe(204)
  })
})

// ─── postgres-raw mode ────────────────────────────────────────────────────────

const RUN_PG = Boolean(Bun.env.DATABASE_URL)

describe.if(RUN_PG)(
  'drizzle-api: postgres-raw mode (DATABASE_URL required)',
  () => {
    let app: BanhmiApplication
    let base: string

    beforeAll(async () => {
      const { PostgresRawAppModule } = await import(
        '../src/postgres-raw.module'
      )
      app = await BanhmiFactory.create(PostgresRawAppModule)
      await app.listen(0)
      base = app.getUrl()
    })

    afterAll(async () => {
      await app.close()
    })

    test('GET /cats returns array', async () => {
      const res = await fetch(`${base}/cats`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    })

    test('POST /cats creates a cat', async () => {
      const res = await fetch(`${base}/cats`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'PgCat', age: 3 }),
      })
      expect(res.status).toBe(201)
      const body = (await res.json()) as { name: string }
      expect(body.name).toBe('PgCat')
    })
  },
)

describe.if(!RUN_PG)(
  'drizzle-api: postgres-raw mode (skipped: DATABASE_URL not set)',
  () => {
    test('set DATABASE_URL to run postgres-raw integration tests', () => {
      expect(true).toBe(true)
    })
  },
)
