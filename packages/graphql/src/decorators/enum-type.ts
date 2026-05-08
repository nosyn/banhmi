/**
 * Registry of named enum types for use in the schema builder.
 * @internal
 */
export const enumRegistry = new Map<
  object,
  { name: string; description?: string }
>()

/**
 * Options for {@link registerEnumType}.
 *
 * @example
 * registerEnumType(Direction, { name: 'Direction', description: 'Cardinal directions' })
 */
export interface RegisterEnumOptions {
  /** GraphQL name for the enum (required). */
  name: string
  /** Human-readable description shown in the schema. */
  description?: string
}

/**
 * Registers a TypeScript enum as a named GraphQL enum type.
 *
 * @param enumObj - The enum object (e.g. `Direction` from `enum Direction { UP, DOWN }`).
 * @param options - Name and optional description.
 *
 * @example
 * enum Direction { UP = 'UP', DOWN = 'DOWN', LEFT = 'LEFT', RIGHT = 'RIGHT' }
 * registerEnumType(Direction, { name: 'Direction' })
 *
 * // Then use in @Field:
 * @Field(() => Direction) direction!: Direction
 */
export function registerEnumType(
  enumObj: object,
  options: RegisterEnumOptions,
): void {
  enumRegistry.set(enumObj, options)
}
