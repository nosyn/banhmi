import { Mutation, Query, Resolver, Subscription } from '@banhmi/graphql'
import { CatsService } from './cats.service'
import { Cat, CreateCatInput } from './cats.types'

/**
 * Cats GraphQL resolver — demonstrates Query, Mutation, and Subscription.
 *
 * Uses inline `args` option for @Query/@Mutation since TC39 Stage 3
 * decorators do not support parameter decorators.
 */
@Resolver(() => Cat)
export class CatsResolver {
  static inject = [CatsService] as const

  constructor(private readonly catsService: CatsService) {}

  @Query(() => [Cat])
  cats() {
    return this.catsService.findAll()
  }

  @Query(() => Cat, {
    nullable: true,
    args: { id: () => String },
  })
  cat(args: { id: string }) {
    return this.catsService.findById(args.id)
  }

  @Mutation(() => Cat, {
    args: { input: () => CreateCatInput },
  })
  async createCat(args: { input: CreateCatInput }) {
    return this.catsService.create(args.input)
  }

  @Mutation(() => Boolean, {
    args: { id: () => String },
  })
  removeCat(args: { id: string }) {
    return this.catsService.remove(args.id)
  }

  @Subscription(() => Cat, {
    resolve: (payload) => payload,
  })
  catCreated() {
    return this.catsService.pubsub.asyncIterator('cats.created')
  }

  @Subscription(() => Cat, {
    resolve: (payload) => payload,
  })
  catUpdated() {
    return this.catsService.pubsub.asyncIterator('cats.updated')
  }
}
