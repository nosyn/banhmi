import { expect, test } from 'bun:test'
import { QueryHandler } from '../src/decorators'
import { QueryBus } from '../src/query-bus'
import type { IQuery } from '../src/types'

// ---------------------------------------------------------------------------
// Query classes
// ---------------------------------------------------------------------------

type User = { id: string; name: string }

class GetUserQuery implements IQuery {
  constructor(readonly id: string) {}
}

class GetAllUsersQuery implements IQuery {}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

@QueryHandler(GetUserQuery)
class GetUserHandler {
  async execute(query: GetUserQuery): Promise<User> {
    return { id: query.id, name: `User ${query.id}` }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('QueryBus: execute returns query result', async () => {
  const bus = new QueryBus()
  bus.register(GetUserQuery, new GetUserHandler())

  const result = await bus.execute<User>(new GetUserQuery('user-42'))
  expect(result.id).toBe('user-42')
  expect(result.name).toBe('User user-42')
})

test('QueryBus: throws clearly when no handler registered', async () => {
  const bus = new QueryBus()
  await expect(bus.execute(new GetAllUsersQuery())).rejects.toThrow(
    "no handler registered for query 'GetAllUsersQuery'",
  )
})

test('QueryHandler: decorator sets metadata on handler class', () => {
  const meta = GetUserHandler[Symbol.metadata]
  expect(meta).not.toBeNull()
})
