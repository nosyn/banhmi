import { expect, test } from 'bun:test'
import { CommandBus } from '../src/command-bus'
import { CommandHandler } from '../src/decorators'
import type { ICommand } from '../src/types'

// ---------------------------------------------------------------------------
// Command classes
// ---------------------------------------------------------------------------

class CreateUserCommand implements ICommand {
  constructor(
    readonly name: string,
    readonly email: string,
  ) {}
}

class DeleteUserCommand implements ICommand {
  constructor(readonly id: string) {}
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

@CommandHandler(CreateUserCommand)
class CreateUserHandler {
  async execute(cmd: CreateUserCommand): Promise<string> {
    return `user:${cmd.name}:${cmd.email}`
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('CommandBus: @CommandHandler registers handler via decorator metadata', async () => {
  const bus = new CommandBus()

  // Simulate what CqrsExplorer does: read metadata and register
  const meta = CreateUserHandler[Symbol.metadata]
  expect(meta).not.toBeNull()

  const handler = new CreateUserHandler()
  bus.register(CreateUserCommand, handler)

  const result = await bus.execute<string>(
    new CreateUserCommand('Alice', 'alice@example.com'),
  )
  expect(result).toBe('user:Alice:alice@example.com')
})

test('CommandBus: execute dispatches to correct handler', async () => {
  const bus = new CommandBus()
  const handler = new CreateUserHandler()
  bus.register(CreateUserCommand, handler)

  const result = await bus.execute<string>(
    new CreateUserCommand('Bob', 'bob@example.com'),
  )
  expect(result).toBe('user:Bob:bob@example.com')
})

test('CommandBus: throws clearly when no handler registered', async () => {
  const bus = new CommandBus()
  await expect(bus.execute(new DeleteUserCommand('user-1'))).rejects.toThrow(
    "no handler registered for command 'DeleteUserCommand'",
  )
})

test('CommandHandler: decorator metadata is accessible via Symbol.metadata', () => {
  // Verify that the COMMAND_HANDLER_META symbol is present in class metadata
  const { COMMAND_HANDLER_META } = require('../src/decorators')
  const meta = (CreateUserHandler[Symbol.metadata] ?? {}) as Record<
    symbol,
    unknown
  >
  const handlerMeta = meta[COMMAND_HANDLER_META as symbol]
  expect(handlerMeta).not.toBeUndefined()
  expect((handlerMeta as { commandClass: unknown }).commandClass).toBe(
    CreateUserCommand,
  )
})
