import { Query, Resolver } from '@banhmi/graphql'
import { User } from './users.types'

/**
 * Users resolver — demonstrates federation entity resolution.
 */
@Resolver(() => User)
export class UsersResolver {
  private userStore: User[] = [
    { id: 'u1', email: 'alice@example.com', name: 'Alice' },
    { id: 'u2', email: 'bob@example.com', name: 'Bob' },
  ]

  @Query(() => [User])
  users() {
    return this.userStore
  }

  @Query(() => User, {
    nullable: true,
    args: { id: () => String },
  })
  user(args: { id: string }) {
    return this.userStore.find((u) => u.id === args.id)
  }

  /** Resolves a federation reference. */
  static resolveReference(ref: { id: string }): User | undefined {
    const users: User[] = [
      { id: 'u1', email: 'alice@example.com', name: 'Alice' },
      { id: 'u2', email: 'bob@example.com', name: 'Bob' },
    ]
    return users.find((u) => u.id === ref.id)
  }
}
