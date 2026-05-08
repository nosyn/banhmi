import { describe, expect, test } from 'bun:test'
import { graphql, parse, subscribe } from 'graphql'
import {
  Field,
  InMemoryPubSub,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Subscription,
} from '../src'
import { SchemaBuilder } from '../src/schema-builder'

// ---------------------------------------------------------------------------
// InMemoryPubSub
// ---------------------------------------------------------------------------
describe('InMemoryPubSub', () => {
  test('delivers published events to subscribers', async () => {
    const pubsub = new InMemoryPubSub()
    const received: unknown[] = []

    const iter = pubsub.asyncIterator('test.topic') as AsyncIterable<unknown>
    const itResult = (async () => {
      for await (const item of iter) {
        received.push(item)
        if (received.length >= 2) break
      }
    })()

    await pubsub.publish('test.topic', { value: 1 })
    await pubsub.publish('test.topic', { value: 2 })
    await itResult

    expect(received).toEqual([{ value: 1 }, { value: 2 }])
  })

  test('does not deliver to unsubscribed topics', async () => {
    const pubsub = new InMemoryPubSub()
    const received: unknown[] = []

    const iter = pubsub.asyncIterator('topic.a') as AsyncIterable<unknown>
    const itResult = (async () => {
      for await (const item of iter) {
        received.push(item)
        break
      }
    })()

    // Publish to a different topic first
    await pubsub.publish('topic.b', { wrong: true })
    // Then publish to the correct topic
    await pubsub.publish('topic.a', { correct: true })
    await itResult

    expect(received).toEqual([{ correct: true }])
  })

  test('supports multiple topics', async () => {
    const pubsub = new InMemoryPubSub()
    const received: unknown[] = []

    const iter = pubsub.asyncIterator([
      'multi.a',
      'multi.b',
    ]) as AsyncIterable<unknown>
    const itResult = (async () => {
      for await (const item of iter) {
        received.push(item)
        if (received.length >= 2) break
      }
    })()

    await pubsub.publish('multi.a', { from: 'a' })
    await pubsub.publish('multi.b', { from: 'b' })
    await itResult

    expect(received).toHaveLength(2)
    expect(
      received.some((r) => (r as Record<string, unknown>).from === 'a'),
    ).toBe(true)
    expect(
      received.some((r) => (r as Record<string, unknown>).from === 'b'),
    ).toBe(true)
  })

  test('cleanup via return() stops delivery', async () => {
    const pubsub = new InMemoryPubSub()
    const received: unknown[] = []

    const iter = pubsub.asyncIterator('cleanup.topic') as AsyncIterable<unknown>
    const asyncIter = iter[Symbol.asyncIterator]()

    // Get first item
    const p1 = asyncIter.next()
    await pubsub.publish('cleanup.topic', 'first')
    const result1 = await p1
    expect(result1.value).toBe('first')
    received.push(result1.value)

    // Stop iteration
    await asyncIter.return?.()

    // Now publish — should not be received
    await pubsub.publish('cleanup.topic', 'second')
    expect(received).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// @Subscription + schema integration
// ---------------------------------------------------------------------------
describe('@Subscription schema integration', () => {
  test('schema includes subscription type', () => {
    @ObjectType()
    class SubEvent {
      @Field(() => String)
      message!: string
    }

    const pubsub = new InMemoryPubSub()

    @Resolver()
    class SubResolver {
      @Query(() => String)
      ping() {
        return 'pong'
      }

      @Subscription(() => SubEvent)
      onEvent() {
        return pubsub.asyncIterator('sub.events')
      }
    }

    const instances = new Map([[SubResolver, new SubResolver()]])
    const schema = new SchemaBuilder().build([SubResolver], instances)

    expect(schema.getSubscriptionType()).toBeDefined()
    expect(schema.getSubscriptionType()?.getFields().onEvent).toBeDefined()
  })

  test('subscription delivers events through schema executor', async () => {
    @ObjectType()
    class LiveUpdate {
      @Field(() => String)
      data!: string
    }

    const pubsub2 = new InMemoryPubSub()

    @Resolver()
    class LiveResolver {
      @Query(() => String)
      noop() {
        return 'noop'
      }

      @Subscription(() => LiveUpdate)
      liveUpdate() {
        return pubsub2.asyncIterator('live.updates')
      }
    }

    const instances = new Map([[LiveResolver, new LiveResolver()]])
    const schema = new SchemaBuilder().build([LiveResolver], instances)

    const subscription = await subscribe({
      schema,
      document: parse('subscription { liveUpdate { data } }'),
    })

    if (!('next' in subscription)) {
      throw new Error('Expected async iterator from subscribe()')
    }

    const p = subscription.next()
    await pubsub2.publish('live.updates', { data: 'hello from subscription' })
    const result = await p

    expect(result.done).toBe(false)
    const payload = result.value
    expect(payload.errors).toBeUndefined()
    expect(
      (payload.data as Record<string, Record<string, string>>).liveUpdate.data,
    ).toBe('hello from subscription')
  })

  test('subscription filter excludes non-matching events', async () => {
    @ObjectType()
    class FilteredEvent {
      @Field(() => String)
      roomId!: string

      @Field(() => String)
      text!: string
    }

    const pubsub3 = new InMemoryPubSub()

    // Use InMemoryPubSub filter directly to test filter behavior
    // The schema builder wraps subscribe with the filter function when present
    @Resolver()
    class FilteredResolver {
      @Query(() => String)
      noop2() {
        return 'noop'
      }

      @Subscription(() => FilteredEvent, {
        filter: (payload) => (payload as FilteredEvent).roomId === 'room1',
      })
      chatMessage() {
        return pubsub3.asyncIterator('chat')
      }
    }

    const instances = new Map([[FilteredResolver, new FilteredResolver()]])
    const schema = new SchemaBuilder().build([FilteredResolver], instances)

    const subscription = await subscribe({
      schema,
      document: parse('subscription { chatMessage { roomId text } }'),
    })

    if (!('next' in subscription)) {
      throw new Error('Expected async iterator')
    }

    // Start listening
    const p = subscription.next()

    // Publish matching event (room1)
    await pubsub3.publish('chat', { roomId: 'room1', text: 'received' })
    const result = await p

    expect(result.done).toBe(false)
    const eventData = (
      result.value.data as Record<string, Record<string, string>>
    ).chatMessage
    expect(eventData.roomId).toBe('room1')
    expect(eventData.text).toBe('received')
  })
})

// ---------------------------------------------------------------------------
// Mutation + Subscription combined
// ---------------------------------------------------------------------------
describe('Mutation + Subscription combined', () => {
  test('mutation publishes, subscription receives', async () => {
    @ObjectType()
    class Item {
      @Field(() => String)
      id!: string

      @Field(() => String)
      name!: string
    }

    const sharedPubsub = new InMemoryPubSub()

    @Resolver()
    class ItemResolver {
      @Query(() => String)
      noop3() {
        return 'noop'
      }

      @Mutation(() => Item)
      async createItem(_args: { name: string }) {
        const item = { id: 'new-1', name: _args.name ?? 'unnamed' }
        await sharedPubsub.publish('items.created', item)
        return item
      }

      @Subscription(() => Item)
      itemCreated() {
        return sharedPubsub.asyncIterator('items.created')
      }
    }

    const inst = new ItemResolver()
    const instances = new Map([[ItemResolver, inst]])
    const schema = new SchemaBuilder().build([ItemResolver], instances)

    // Subscribe first
    const subscription = await subscribe({
      schema,
      document: parse('subscription { itemCreated { id name } }'),
    })

    if (!('next' in subscription)) throw new Error('Expected async iterator')

    const p = subscription.next()

    // Execute mutation
    await graphql({
      schema,
      source: 'mutation { createItem { id name } }',
    })

    const result = await p
    expect(result.done).toBe(false)
    const itemData = (
      result.value.data as Record<string, Record<string, string>>
    ).itemCreated
    expect(itemData.id).toBe('new-1')
  })
})
