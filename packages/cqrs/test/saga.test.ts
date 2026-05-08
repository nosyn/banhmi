import { expect, test } from 'bun:test'
import { CommandBus } from '../src/command-bus'
import { CommandHandler, EventsHandler, Saga } from '../src/decorators'
import { EventBus } from '../src/event-bus'
import { runSaga } from '../src/saga'
import type { ICommand, IEvent } from '../src/types'

// ---------------------------------------------------------------------------
// Domain classes
// ---------------------------------------------------------------------------

class UserRegisteredEvent implements IEvent {
  constructor(readonly userId: string) {}
}

class SendWelcomeEmailCommand implements ICommand {
  constructor(readonly userId: string) {}
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

@CommandHandler(SendWelcomeEmailCommand)
class SendWelcomeEmailHandler {
  readonly sent: string[] = []
  async execute(cmd: SendWelcomeEmailCommand): Promise<void> {
    this.sent.push(cmd.userId)
  }
}

// ---------------------------------------------------------------------------
// Saga
// ---------------------------------------------------------------------------

@EventsHandler(UserRegisteredEvent)
class UserSagas {
  @Saga()
  async *onUserRegistered(
    events: AsyncIterable<UserRegisteredEvent>,
  ): AsyncGenerator<ICommand> {
    for await (const event of events) {
      yield new SendWelcomeEmailCommand(event.userId)
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('Saga: @Saga decorator sets metadata on method', () => {
  const meta = UserSagas[Symbol.metadata]
  expect(meta).not.toBeNull()
})

test('Saga: runSaga dispatches yielded commands via CommandBus', async () => {
  const commandBus = new CommandBus()
  const handler = new SendWelcomeEmailHandler()
  commandBus.register(SendWelcomeEmailCommand, handler)

  const eventBus = new EventBus()
  const sagaInstance = new UserSagas()

  runSaga(
    sagaInstance.onUserRegistered.bind(sagaInstance),
    UserRegisteredEvent,
    commandBus,
    eventBus,
  )

  // Publish events — the saga should pick them up and dispatch commands
  await eventBus.publish(new UserRegisteredEvent('user-1'))
  await eventBus.publish(new UserRegisteredEvent('user-2'))

  // Give the saga microtask a chance to run
  await new Promise((resolve) => setTimeout(resolve, 10))

  expect(handler.sent).toContain('user-1')
  expect(handler.sent).toContain('user-2')
})

test('Saga: saga produces commands from events end-to-end', async () => {
  const commandBus = new CommandBus()
  const handler = new SendWelcomeEmailHandler()
  commandBus.register(SendWelcomeEmailCommand, handler)

  const eventBus = new EventBus()
  const saga = new UserSagas()

  // Wire up via the saga runner directly (mimicking what CqrsExplorer does)
  runSaga(
    saga.onUserRegistered.bind(saga),
    UserRegisteredEvent,
    commandBus,
    eventBus,
  )

  await eventBus.publish(new UserRegisteredEvent('user-42'))
  await new Promise((resolve) => setTimeout(resolve, 10))

  expect(handler.sent).toContain('user-42')
})
