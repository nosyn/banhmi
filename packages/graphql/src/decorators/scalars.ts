/**
 * Scalar type markers for use with {@link Field}.
 *
 * These are sentinel values used in type-thunks to indicate
 * built-in GraphQL scalar types.
 *
 * @example
 * @Field(() => ID) id!: string
 * @Field(() => Int) age!: number
 * @Field(() => Float) rating!: number
 */

/**
 * Marker class for the GraphQL `Int` scalar (32-bit integer).
 *
 * @example
 * @Field(() => Int) count!: number
 */
export class Int {
  private constructor() {}
}

/**
 * Marker class for the GraphQL `Float` scalar (double-precision float).
 *
 * @example
 * @Field(() => Float) price!: number
 */
export class Float {
  private constructor() {}
}

/**
 * Marker class for the GraphQL `ID` scalar.
 *
 * @example
 * @Field(() => ID) id!: string
 */
export class ID {
  private constructor() {}
}
