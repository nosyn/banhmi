import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { DRIZZLE_DB } from '@banhmi/drizzle'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule, CatService } from './index'

describe('drizzle feature: module registration', () => {
  let app: BanhmiApplication

  beforeAll(async () => {
    app = await BanhmiFactory.create(AppModule)
  })

  afterAll(async () => {
    await app.close()
  })

  test('DRIZZLE_DB token is registered in the container', () => {
    const db = app.container.resolve(DRIZZLE_DB)
    expect(db).toBeDefined()
    expect(typeof db).toBe('object')
  })

  test('CatService is registered and functional', () => {
    const service = app.container.resolve(CatService)
    expect(service).toBeDefined()

    const all = service.findAll()
    expect(Array.isArray(all)).toBe(true)
    expect(all).toHaveLength(0)
  })

  test('CatService.create inserts a cat and findAll returns it', () => {
    const service = app.container.resolve(CatService)

    const inserted = service.create({ name: 'Whiskers', breed: 'Maine Coon' })
    expect(inserted.name).toBe('Whiskers')
    expect(inserted.breed).toBe('Maine Coon')
    expect(typeof inserted.id).toBe('number')

    const all = service.findAll()
    expect(all.length).toBeGreaterThanOrEqual(1)
  })

  test('CatService.findById returns the inserted cat', () => {
    const service = app.container.resolve(CatService)

    const cat = service.create({ name: 'Felix' })
    const found = service.findById(cat.id)
    expect(found).not.toBeNull()
    expect(found?.name).toBe('Felix')
  })

  test('CatService.findById returns null for non-existent id', () => {
    const service = app.container.resolve(CatService)
    const result = service.findById(999999)
    expect(result).toBeNull()
  })
})

describe('drizzle feature: HTTP endpoints', () => {
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

  test('POST /cats creates a cat', async () => {
    const res = await fetch(`${base}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Mittens', breed: 'Persian' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      id: number
      name: string
      breed: string
    }
    expect(body.name).toBe('Mittens')
    expect(body.breed).toBe('Persian')
  })

  test('GET /cats returns array', async () => {
    const res = await fetch(`${base}/cats`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /cats/:id returns 200', async () => {
    // First create a cat to ensure at least one exists.
    const post = await fetch(`${base}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Shadow' }),
    })
    const created = (await post.json()) as { id: number }

    const res = await fetch(`${base}/cats/${created.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { name: string }
    expect(body.name).toBe('Shadow')
  })
})
