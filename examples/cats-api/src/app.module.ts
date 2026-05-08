import { CompressionModule } from '@banhmi/compression'
import { CookiesModule } from '@banhmi/cookies'
import type { MiddlewareConsumer } from '@banhmi/middleware'
import { VersioningModule } from '@banhmi/versioning'
import { Module } from 'banhmi'
import { CatsModule } from './cats/cats.module'
import { EventsGateway } from './events/events.gateway'
import { SessionController } from './session/session.controller'

/**
 * Captured log entries written by the logger middleware.
 * Exported so integration tests can inspect it without
 * coupling to stdout.
 */
export const requestLog: string[] = []

/**
 * Root application module.
 *
 * Wires:
 * - Logger middleware applied to all routes.
 * - URI versioning (`/v1/cats`, `/v2/cats`).
 * - Signed-cookie support.
 * - Bun-native gzip compression for large responses.
 */
@Module({
  imports: [
    CatsModule,
    VersioningModule.forRoot({ type: 'uri', prefix: 'v' }),
    CookiesModule.forRoot({
      secret: Bun.env.BANHMI_COOKIE_SECRET ?? 'cats-api-dev-secret',
    }),
    CompressionModule.forRoot({ threshold: 1024 }),
  ],
  controllers: [SessionController],
  gateways: [EventsGateway],
  providers: [EventsGateway],
})
export class AppModule {
  /**
   * Module-level middleware configuration.
   * Applies the logger middleware to all routes.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        async (req: Request, _ctx: unknown, next: () => Promise<Response>) => {
          const url = new URL(req.url)
          requestLog.push(`${req.method} ${url.pathname}`)
          return next()
        },
      )
      .forRoutes('')
  }
}
