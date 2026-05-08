import { describe, expect, test } from 'bun:test'
import { MemorySessionStore } from '../src/stores/memory'

describe('MemorySessionStore', () => {
  test('round-trips session data', async () => {
    const store = new MemorySessionStore()
    await store.set('s1', { userId: 'abc', role: 'admin' }, 60)
    const data = await store.get('s1')
    expect(data).toEqual({ userId: 'abc', role: 'admin' })
  })

  test('returns null for missing session', async () => {
    const store = new MemorySessionStore()
    const data = await store.get('nonexistent')
    expect(data).toBeNull()
  })

  test('expires session after TTL', async () => {
    const store = new MemorySessionStore()
    // Set with effectively-expired TTL by manipulating the store's internals
    // We do it by setting TTL=0 and then accessing after 1ms
    await store.set('s2', { value: 'test' }, 0)
    // Wait 1ms to ensure expiry
    await new Promise((r) => setTimeout(r, 10))
    const data = await store.get('s2')
    expect(data).toBeNull()
  })

  test('destroy removes the session', async () => {
    const store = new MemorySessionStore()
    await store.set('s3', { key: 'value' }, 60)
    await store.destroy('s3')
    const data = await store.get('s3')
    expect(data).toBeNull()
  })

  test('overwrites existing session on set', async () => {
    const store = new MemorySessionStore()
    await store.set('s4', { a: 1 }, 60)
    await store.set('s4', { a: 2, b: 3 }, 60)
    const data = await store.get('s4')
    expect(data).toEqual({ a: 2, b: 3 })
  })

  test('destroy of non-existent id is a no-op', async () => {
    const store = new MemorySessionStore()
    // Should not throw
    await store.destroy('ghost-id')
    expect(true).toBe(true)
  })
})
