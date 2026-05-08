import { SchemaBuilder } from '@banhmi/graphql'
import { CatsResolver } from './cats/cats.resolver'
import { CatsService } from './cats/cats.service'
import { UsersResolver } from './users/users.resolver'

/**
 * AppModule bootstraps the graphql-demo application.
 *
 * Wires up all resolvers and services, then builds the GraphQL schema.
 */
export class AppModule {
  readonly catsService: CatsService
  readonly catsResolver: CatsResolver
  readonly usersResolver: UsersResolver

  constructor() {
    this.catsService = new CatsService()
    this.catsResolver = new CatsResolver(this.catsService)
    this.usersResolver = new UsersResolver()
  }

  buildSchema() {
    const resolvers = [CatsResolver, UsersResolver]
    const instances = new Map([
      [CatsResolver, this.catsResolver],
      [UsersResolver, this.usersResolver],
    ])
    return new SchemaBuilder().build(resolvers, instances)
  }
}
