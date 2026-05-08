/**
 * graphql-demo — demonstrates @banhmi/graphql features.
 *
 * Features shown:
 * - Code-first schema with @ObjectType, @Field, @Resolver
 * - @Query, @Mutation, @Subscription
 * - @InputType, @Key (federation)
 * - InMemoryPubSub for subscriptions
 * - Mapped types (PartialType, etc. via cats types)
 *
 * Run: bun run src/main.ts
 */

import { printSchema } from 'graphql'
import { AppModule } from './app.module'

const app = new AppModule()
const schema = app.buildSchema()

// Print the SDL for the demo
const sdl = printSchema(schema)
console.log('=== GraphQL Schema (SDL) ===')
console.log(sdl)
console.log('\nDemo schema built successfully!')
console.log(
  `Types: ${Object.keys(schema.getTypeMap())
    .filter((t) => !t.startsWith('__'))
    .join(', ')}`,
)
