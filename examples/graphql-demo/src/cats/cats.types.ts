import { Field, ID, InputType, Int, ObjectType } from '@banhmi/graphql'

/**
 * Cat GraphQL Object Type.
 */
@ObjectType({ description: 'A cat entity' })
export class Cat {
  @Field(() => ID)
  id!: string

  @Field(() => String)
  name!: string

  @Field(() => Int, { nullable: true })
  age?: number

  @Field(() => String, { nullable: true })
  breed?: string
}

/**
 * Input type for creating a new cat.
 */
@InputType()
export class CreateCatInput {
  @Field(() => String)
  name!: string

  @Field(() => Int, { nullable: true })
  age?: number

  @Field(() => String, { nullable: true })
  breed?: string
}

/**
 * Input type for updating an existing cat.
 */
@InputType()
export class UpdateCatInput {
  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => Int, { nullable: true })
  age?: number

  @Field(() => String, { nullable: true })
  breed?: string
}
