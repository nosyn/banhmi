import { Field, ID, Key, ObjectType } from '@banhmi/graphql'

/**
 * User entity for Federation demo.
 * Uses @Key to mark as a Federation entity type.
 */
@ObjectType({ description: 'A user entity (federation demo)' })
@Key('id')
export class User {
  @Field(() => ID)
  id!: string

  @Field(() => String)
  email!: string

  @Field(() => String, { nullable: true })
  name?: string
}
