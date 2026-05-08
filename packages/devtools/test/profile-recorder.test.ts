import { describe, expect, test } from 'bun:test'
import { ProfileRecorder } from '../src/profile/recorder'
import type { ProfileRecord } from '../src/types'

function makeRecord(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    traceId: crypto.randomUUID(),
    route: '/test',
    method: 'GET',
    statusCode: 200,
    totalMs: 10,
    stages: [{ name: 'request', durationMs: 10 }],
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('ProfileRecorder', () => {
  test('push then list returns the record', () => {
    const recorder = new ProfileRecorder(10)
    const record = makeRecord({ route: '/cats' })
    recorder.push(record)
    const list = recorder.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.route).toBe('/cats')
  })

  test('list returns most-recent first', () => {
    const recorder = new ProfileRecorder(10)
    recorder.push(makeRecord({ route: '/first', timestamp: 1000 }))
    recorder.push(makeRecord({ route: '/second', timestamp: 2000 }))
    recorder.push(makeRecord({ route: '/third', timestamp: 3000 }))

    const list = recorder.list()
    expect(list[0]?.route).toBe('/third')
    expect(list[1]?.route).toBe('/second')
    expect(list[2]?.route).toBe('/first')
  })

  test('ring buffer caps at profileSize — oldest entries are evicted', () => {
    const recorder = new ProfileRecorder(3)
    recorder.push(makeRecord({ route: '/a' }))
    recorder.push(makeRecord({ route: '/b' }))
    recorder.push(makeRecord({ route: '/c' }))
    recorder.push(makeRecord({ route: '/d' })) // evicts /a

    const list = recorder.list()
    expect(list).toHaveLength(3)
    const routes = list.map((r) => r.route)
    expect(routes).toContain('/d')
    expect(routes).toContain('/c')
    expect(routes).toContain('/b')
    expect(routes).not.toContain('/a')
  })

  test('clear empties the buffer', () => {
    const recorder = new ProfileRecorder(10)
    recorder.push(makeRecord())
    recorder.push(makeRecord())
    recorder.clear()
    expect(recorder.list()).toHaveLength(0)
  })

  test('list on empty buffer returns empty array', () => {
    const recorder = new ProfileRecorder(10)
    expect(recorder.list()).toEqual([])
  })

  test('ring buffer wraps correctly with many pushes', () => {
    const capacity = 5
    const recorder = new ProfileRecorder(capacity)
    for (let i = 0; i < 20; i++) {
      recorder.push(makeRecord({ route: `/route-${i}`, timestamp: i }))
    }
    const list = recorder.list()
    expect(list).toHaveLength(capacity)
    // Most recent is route-19
    expect(list[0]?.route).toBe('/route-19')
    expect(list[4]?.route).toBe('/route-15')
  })

  test('capacity=1 retains only the last record', () => {
    const recorder = new ProfileRecorder(1)
    recorder.push(makeRecord({ route: '/old' }))
    recorder.push(makeRecord({ route: '/new' }))
    const list = recorder.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.route).toBe('/new')
  })
})
