import { describe, expect, test } from 'bun:test'
import { EventEmitter } from '../src/event-emitter'
import type { EventListener } from '../src/types'

describe('EventEmitter', () => {
  test('emit calls listener with payload and event name', () => {
    const emitter = new EventEmitter()
    const received: Array<[unknown, string]> = []
    emitter.on('user.created', (payload, name) => {
      received.push([payload, name])
    })
    emitter.emit('user.created', { id: 1 })
    expect(received).toHaveLength(1)
    expect(received[0]?.[0]).toEqual({ id: 1 })
    expect(received[0]?.[1]).toBe('user.created')
  })

  test('emit does not call listener for non-matching event', () => {
    const emitter = new EventEmitter()
    const calls: unknown[] = []
    emitter.on('user.created', (p) => calls.push(p))
    emitter.emit('user.deleted', { id: 2 })
    expect(calls).toHaveLength(0)
  })

  test('on returns an unsubscribe fn that actually unsubscribes', () => {
    const emitter = new EventEmitter()
    const calls: unknown[] = []
    const unsubscribe = emitter.on('test.event', (p) => calls.push(p))
    emitter.emit('test.event', 'first')
    unsubscribe()
    emitter.emit('test.event', 'second')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toBe('first')
  })

  test('off removes the listener', () => {
    const emitter = new EventEmitter()
    const calls: unknown[] = []
    const listener: EventListener = (p) => calls.push(p)
    emitter.on('foo', listener)
    emitter.off('foo', listener)
    emitter.emit('foo', 'x')
    expect(calls).toHaveLength(0)
  })

  test('multiple listeners for the same event all fire in registration order', () => {
    const emitter = new EventEmitter()
    const order: number[] = []
    emitter.on('ev', () => order.push(1))
    emitter.on('ev', () => order.push(2))
    emitter.on('ev', () => order.push(3))
    emitter.emit('ev', null)
    expect(order).toEqual([1, 2, 3])
  })

  test('wildcard user.* matches user.created but not user', () => {
    const emitter = new EventEmitter()
    const calls: string[] = []
    emitter.on('user.*', (_p, name) => calls.push(name))
    emitter.emit('user.created', null)
    emitter.emit('user.deleted', null)
    emitter.emit('user', null)
    expect(calls).toEqual(['user.created', 'user.deleted'])
  })

  test('wildcard user.* does not match user.created.email (two levels)', () => {
    const emitter = new EventEmitter()
    const calls: string[] = []
    emitter.on('user.*', (_p, name) => calls.push(name))
    emitter.emit('user.created.email', null)
    expect(calls).toHaveLength(0)
  })

  test('wildcard user.** matches user, user.created, user.created.email', () => {
    const emitter = new EventEmitter()
    const calls: string[] = []
    emitter.on('user.**', (_p, name) => calls.push(name))
    emitter.emit('user', null)
    emitter.emit('user.created', null)
    emitter.emit('user.created.email', null)
    expect(calls).toEqual(['user', 'user.created', 'user.created.email'])
  })

  test('sync listener errors are caught and do not break other listeners', () => {
    const emitter = new EventEmitter()
    const calls: number[] = []
    emitter.on('ev', () => {
      throw new Error('boom')
    })
    emitter.on('ev', () => calls.push(1))
    expect(() => emitter.emit('ev', null)).not.toThrow()
    expect(calls).toEqual([1])
  })

  test('emitAsync awaits async listeners and resolves with array', async () => {
    const emitter = new EventEmitter()
    const done: string[] = []
    emitter.on('ev', async () => {
      await Promise.resolve()
      done.push('a')
    })
    emitter.on('ev', async () => {
      await Promise.resolve()
      done.push('b')
    })
    const results = await emitter.emitAsync('ev', null)
    expect(results).toHaveLength(2)
    expect(done).toContain('a')
    expect(done).toContain('b')
  })

  test('emitAsync includes rejected promises as thrown errors in result', async () => {
    const emitter = new EventEmitter()
    emitter.on('ev', async () => {
      throw new Error('async fail')
    })
    // emitAsync uses Promise.all which rejects if any promise rejects
    await expect(emitter.emitAsync('ev', null)).rejects.toThrow('async fail')
  })

  test('emitAsync returns empty array when no listeners match', async () => {
    const emitter = new EventEmitter()
    const results = await emitter.emitAsync('nothing', null)
    expect(results).toEqual([])
  })
})
