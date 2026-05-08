// Demo: @banhmi/sentry — exception filter + interceptor bridge.
//
// This demo uses enabled: false so no real Sentry DSN is required.
// Replace with your real DSN in production.

import { SentryModule } from '@banhmi/sentry'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module } from 'banhmi'

@Controller()
export class AppController {
  @Get('/ping')
  ping(_ctx: RouteCtx) {
    return { pong: true }
  }
}

@Module({
  imports: [
    SentryModule.forRoot({
      dsn: 'https://mock@sentry.io/0',
      environment: 'test',
      enabled: false, // don't contact real Sentry in demo/tests
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
