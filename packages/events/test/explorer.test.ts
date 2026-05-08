import { describe, expect, test } from 'bun:test'
import { Injectable } from '@banhmi/common'
import { OnEvent } from '../src/decorators'
import { EventEmitter } from '../src/event-emitter'
import { EventsExplorer } from '../src/explorer'

describe('EventsExplorer', () => {
  test('@OnEvent registered method is called when event emits', () => {
    const received: unknown[] = []

    @Injectable()
    class NotifService {
      @OnEvent('user.created')
      handleCreated(payload: unknown) {
        received.push(payload)
      }
    }

    const emitter = new EventEmitter()
    const instance = new NotifService()
    const explorer = new EventsExplorer()
    explorer.explore(emitter, [[instance, NotifService]])

    emitter.emit('user.created', { id: 5 })
    expect(received).toHaveLength(1)
    expect(received[0]).toEqual({ id: 5 })
  })

  test('@OnEvent with wildcard pattern registers correctly', () => {
    const received: string[] = []

    @Injectable()
    class WildService {
      @OnEvent('order.*')
      onOrder(_payload: unknown, name: string) {
        received.push(name)
      }
    }

    const emitter = new EventEmitter()
    const instance = new WildService()
    const explorer = new EventsExplorer()
    explorer.explore(emitter, [[instance, WildService]])

    emitter.emit('order.placed', null)
    emitter.emit('order.shipped', null)
    emitter.emit('order', null) // should not match
    expect(received).toEqual(['order.placed', 'order.shipped'])
  })

  test('multiple @OnEvent methods on the same class all register', () => {
    const log: string[] = []

    @Injectable()
    class MultiService {
      @OnEvent('a.one')
      onOne() {
        log.push('one')
      }

      @OnEvent('a.two')
      onTwo() {
        log.push('two')
      }
    }

    const emitter = new EventEmitter()
    const instance = new MultiService()
    const explorer = new EventsExplorer()
    explorer.explore(emitter, [[instance, MultiService]])

    emitter.emit('a.one', null)
    emitter.emit('a.two', null)
    expect(log).toEqual(['one', 'two'])
  })

  test('classes without @OnEvent are skipped gracefully', () => {
    @Injectable()
    class PlainService {
      greet() {
        return 'hi'
      }
    }

    const emitter = new EventEmitter()
    const instance = new PlainService()
    const explorer = new EventsExplorer()
    // Should not throw
    expect(() =>
      explorer.explore(emitter, [[instance, PlainService]]),
    ).not.toThrow()
  })
})
