import { expect, test } from 'bun:test'
import { MemoryThrottlerStorage } from '../src/storage/memory'

test('memory storage: increments correctly within window', async () => {
  const storage = new MemoryThrottlerStorage()
  const { count: c1 } = await storage.increment('key1', 60_000)
  const { count: c2 } = await storage.increment('key1', 60_000)
  const { count: c3 } = await storage.increment('key1', 60_000)
  expect(c1).toBe(1)
  expect(c2).toBe(2)
  expect(c3).toBe(3)
})

test('memory storage: returns resetAt in the future', async () => {
  const storage = new MemoryThrottlerStorage()
  const before = Date.now()
  const { resetAt } = await storage.increment('key2', 5_000)
  const after = Date.now()
  expect(resetAt).toBeGreaterThanOrEqual(before + 4_000)
  expect(resetAt).toBeLessThanOrEqual(after + 5_100)
})

test('memory storage: different keys are tracked independently', async () => {
  const storage = new MemoryThrottlerStorage()
  await storage.increment('a', 60_000)
  await storage.increment('a', 60_000)
  const { count: bCount } = await storage.increment('b', 60_000)
  const { count: aCount } = await storage.increment('a', 60_000)
  expect(bCount).toBe(1)
  expect(aCount).toBe(3)
})

test('memory storage: expired entries reset on next increment', async () => {
  const storage = new MemoryThrottlerStorage()
  // Use a very short TTL (1ms) to simulate expiry
  await storage.increment('expire-key', 1)
  await storage.increment('expire-key', 1)
  // Wait for expiry
  await Bun.sleep(10)
  const { count } = await storage.increment('expire-key', 60_000)
  expect(count).toBe(1)
})

test('memory storage: concurrent increments are sequential', async () => {
  const storage = new MemoryThrottlerStorage()
  // Since JS is single-threaded, these await calls serialize naturally
  const results = await Promise.all([
    storage.increment('concurrent', 60_000),
    storage.increment('concurrent', 60_000),
    storage.increment('concurrent', 60_000),
  ])
  const counts = results.map((r) => r.count).sort((a, b) => a - b)
  expect(counts).toEqual([1, 2, 3])
})
