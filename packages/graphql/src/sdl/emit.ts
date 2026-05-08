import type { GraphQLSchema } from 'graphql'
import { printSchema } from 'graphql'

/**
 * Options for {@link emitSdl}.
 */
export interface SdlEmitOptions {
  /**
   * Optional file path to write the SDL to.
   * When set, the SDL is written to this path using `Bun.write`.
   */
  outputPath?: string
  /**
   * Whether to include built-in types (String, Boolean, etc.) in the SDL.
   * @default false
   */
  includeBuiltins?: boolean
}

/**
 * Emits the SDL (Schema Definition Language) string for the given schema.
 *
 * Optionally writes the SDL to a file if `outputPath` is provided.
 *
 * @param schema - The built GraphQL schema.
 * @param options - Emit options.
 * @returns The SDL string.
 *
 * @example
 * const schema = new SchemaBuilder().build(resolvers, instances)
 * const sdl = emitSdl(schema, { outputPath: './schema.graphql' })
 * console.log(sdl) // type Query { ... }
 */
export function emitSdl(
  schema: GraphQLSchema,
  options: SdlEmitOptions = {},
): string {
  const sdl = printSchema(schema)

  if (options.outputPath) {
    Bun.write(options.outputPath, sdl).catch((err: unknown) => {
      console.error('[emitSdl] Failed to write SDL to', options.outputPath, err)
    })
  }

  return sdl
}
