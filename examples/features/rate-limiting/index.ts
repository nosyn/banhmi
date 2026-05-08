// Demo: @banhmi/throttler — rate-limit GET / at 5 requests per 10 seconds.
import { ThrottlerModule } from '@banhmi/throttler'
import { Controller, Get, Module } from 'banhmi'

@Controller()
export class DemoController {
  @Get('/')
  index() {
    return { ok: true }
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 10_000, // 10 seconds
      limit: 5, // max 5 requests per window
      keyGenerator: () => 'demo-client', // fixed key for demo
    }),
  ],
  controllers: [DemoController],
})
export class AppModule {}
