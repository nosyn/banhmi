import { Module } from '@banhmi/common'

/**
 * Optional standalone module for `@banhmi/middleware`.
 *
 * Importing this module is **not required** — `@UseMiddleware` and the
 * `configure(consumer)` module-level binding work without it. It is provided
 * for projects that want to import middleware utilities via the module system.
 *
 * @example
 * import { MiddlewareModule } from '@banhmi/middleware'
 *
 * \@Module({ imports: [MiddlewareModule] })
 * class AppModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(LoggerMiddleware).forRoutes('cats')
 *   }
 * }
 */
@Module({})
export class MiddlewareModule {}
