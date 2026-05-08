// Demo: @banhmi/otel — OpenTelemetry SDK bootstrap + interceptor.
//
// This demo uses enabled: false so no real OTel SDK is required.
// Replace with real exporters in production.

import { OtelModule } from '@banhmi/otel'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module } from 'banhmi'

@Controller()
export class AppController {
  @Get('/hello')
  hello(_ctx: RouteCtx) {
    return { message: 'hello from otel demo' }
  }
}

@Module({
  imports: [
    OtelModule.forRoot({
      serviceName: 'otel-demo',
      exporters: ['console'],
      enabled: false, // don't start SDK in demo/tests
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
