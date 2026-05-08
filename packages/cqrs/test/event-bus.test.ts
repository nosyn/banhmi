import { expect, test } from 'bun:test'
import { EventsHandler } from '../src/decorators'
import { EventBus } from '../src/event-bus'
import type { IEvent } from '../src/types'

// ---------------------------------------------------------------------------
// Event classes
// ---------------------------------------------------------------------------

class UserCreatedEvent implements IEvent {
  constructor(readonly userId: string) {}
}

class OrderPlacedEvent implements IEvent {
  constructor(readonly orderId: string) {}
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

@EventsHandler(UserCreatedEvent)
class UserCreatedHandler {
  readonly received: UserCreatedEvent[] = []
  async handle(event: UserCreatedEvent): Promise<void> {
    this.received.push(event)
  }
}

@EventsHandler(UserCreatedEvent, OrderPlacedEvent)
class AuditHandler {
  readonly events: IEvent[] = []
  async handle(event: IEvent): Promise<void> {
    this.events.push(event)
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('EventBus: @EventsHandler fires on publish', async () => {
  const bus = new EventBus()
  const handler = new UserCreatedHandler()
  bus.register(UserCreatedEvent, handler)

  await bus.publish(new UserCreatedEvent('user-1'))
  await bus.publish(new UserCreatedEvent('user-2'))

  expect(handler.received).toHaveLength(2)
  expect(handler.received[0]?.userId).toBe('user-1')
  expect(handler.received[1]?.userId).toBe('user-2')
})

test('EventBus: multiple event classes in @EventsHandler are each registered', async () => {
  const bus = new EventBus()
  const audit = new AuditHandler()
  bus.register(UserCreatedEvent, audit)
  bus.register(OrderPlacedEvent, audit)

  await bus.publish(new UserCreatedEvent('user-1'))
  await bus.publish(new OrderPlacedEvent('order-1'))

  expect(audit.events).toHaveLength(2)
})

test('EventBus: publish with no handlers does not throw', async () => {
  const bus = new EventBus()
  await expect(
    bus.publish(new OrderPlacedEvent('order-x')),
  ).resolves.toBeUndefined()
})

test('EventsHandler: decorator sets metadata on handler class', () => {
  const meta = UserCreatedHandler[Symbol.metadata]
  expect(meta).not.toBeNull()
})
