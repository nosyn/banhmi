import { describe, expect, test } from 'bun:test'
import { graphql, parse, subscribe } from 'graphql'
import { AppModule } from '../src/app.module'

const app = new AppModule()
const schema = app.buildSchema()

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
describe('graphql-demo: queries', () => {
  test('lists all cats', async () => {
    const result = await graphql({
      schema,
      source: '{ cats { id name } }',
    })
    expect(result.errors).toBeUndefined()
    const cats = (result.data as Record<string, unknown>).cats as {
      id: string
      name: string
    }[]
    expect(cats.length).toBeGreaterThanOrEqual(2)
    expect(cats.some((c) => c.name === 'Garfield')).toBe(true)
  })

  test('gets a single cat by id', async () => {
    const result = await graphql({
      schema,
      source: '{ cat(id: "1") { id name breed } }',
    })
    expect(result.errors).toBeUndefined()
    const cat = (result.data as Record<string, unknown>).cat as Record<
      string,
      string
    >
    expect(cat.name).toBe('Garfield')
    expect(cat.breed).toBe('Persian')
  })

  test('returns null for unknown cat id', async () => {
    const result = await graphql({
      schema,
      source: '{ cat(id: "9999") { id name } }',
    })
    expect(result.errors).toBeUndefined()
    expect((result.data as Record<string, unknown>).cat).toBeNull()
  })

  test('lists all users', async () => {
    const result = await graphql({
      schema,
      source: '{ users { id email name } }',
    })
    expect(result.errors).toBeUndefined()
    const users = (result.data as Record<string, unknown>).users as {
      id: string
      email: string
    }[]
    expect(users.some((u) => u.email === 'alice@example.com')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
describe('graphql-demo: mutations', () => {
  test('creates a new cat', async () => {
    const result = await graphql({
      schema,
      source: `mutation {
        createCat(input: { name: "Whiskers", age: 2, breed: "Siamese" }) {
          id name age breed
        }
      }`,
    })
    expect(result.errors).toBeUndefined()
    const cat = (result.data as Record<string, unknown>).createCat as Record<
      string,
      unknown
    >
    expect(cat.name).toBe('Whiskers')
    expect(cat.age).toBe(2)
    expect(cat.breed).toBe('Siamese')
  })

  test('removes a cat', async () => {
    // First create one to remove
    const createResult = await graphql({
      schema,
      source: 'mutation { createCat(input: { name: "ToDelete" }) { id } }',
    })
    const id = (createResult.data as Record<string, Record<string, string>>)
      .createCat.id

    const removeResult = await graphql({
      schema,
      source: `mutation { removeCat(id: "${id}") }`,
    })
    expect(removeResult.errors).toBeUndefined()
    expect((removeResult.data as Record<string, unknown>).removeCat).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
describe('graphql-demo: subscriptions', () => {
  test('catCreated subscription receives new cats', async () => {
    const subscription = await subscribe({
      schema,
      document: parse('subscription { catCreated { id name } }'),
    })

    if (!('next' in subscription)) {
      throw new Error('Expected async iterator from subscribe()')
    }

    const p = subscription.next()

    await graphql({
      schema,
      source: 'mutation { createCat(input: { name: "SubCat" }) { id } }',
    })

    const result = await p
    expect(result.done).toBe(false)
    const catData = (
      result.value.data as Record<string, Record<string, string>>
    ).catCreated
    expect(catData.name).toBe('SubCat')
  })
})
