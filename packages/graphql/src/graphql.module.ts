import type { GraphQLSchema } from 'graphql'
import { printSchema } from 'graphql'
import { SchemaBuilder } from './schema-builder'
import type { GraphQLOptions } from './types'

type AnyClass = new (...args: unknown[]) => unknown

/**
 * The main module for `@banhmi/graphql`.
 *
 * Use `GraphQLModule.forRoot()` to configure and mount a GraphQL endpoint
 * on top of a running BanhmiApplication (via `graphql-yoga`).
 *
 * @example
 * @Module({
 *   imports: [
 *     GraphQLModule.forRoot({
 *       resolvers: [CatResolver],
 *       path: '/graphql',
 *     }),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class GraphQLModule {
  /**
   * Build a GraphQL schema from the provided resolver classes.
   *
   * Mounts a `graphql-yoga` HTTP handler at `options.path` (default `/graphql`).
   * If `options.autoSchemaFile` is set, the SDL is written to that file.
   *
   * @param options - Configuration options.
   * @returns A dynamic module configuration object.
   */
  static forRoot(options: GraphQLOptions): {
    module: typeof GraphQLModule
    providers: { provide: symbol; useValue: GraphQLOptions }[]
  } {
    return {
      module: GraphQLModule,
      providers: [
        {
          provide: Symbol.for('GRAPHQL_OPTIONS'),
          useValue: options,
        },
      ],
    }
  }

  /**
   * Build a {@link GraphQLSchema} from the given resolver classes and instances.
   *
   * @param resolvers - Resolver classes decorated with `@Resolver`.
   * @param instances - Map of resolver class to its live instance.
   * @param options - GraphQL module options.
   */
  static buildSchema(
    resolvers: AnyClass[],
    instances: Map<AnyClass, unknown>,
    options: Pick<GraphQLOptions, 'autoSchemaFile'> = {},
  ): GraphQLSchema {
    const builder = new SchemaBuilder()
    const schema = builder.build(resolvers, instances)

    if (options.autoSchemaFile) {
      const sdl = printSchema(schema)
      Bun.write(options.autoSchemaFile, sdl).catch((err: unknown) => {
        console.error('[GraphQLModule] Failed to write schema SDL:', err)
      })
    }

    return schema
  }
}
