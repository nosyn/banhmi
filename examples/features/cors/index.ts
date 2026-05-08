// Demo: @banhmi/security CorsModule — single allowed origin.
import { CorsModule } from '@banhmi/security'
import { Controller, Get, Module } from 'banhmi'

export const ALLOWED_ORIGIN = 'https://app.example.com'

@Controller()
export class DemoController {
  @Get('/')
  index() {
    return { hello: 'world' }
  }
}

@Module({
  imports: [CorsModule.forRoot({ origin: ALLOWED_ORIGIN, credentials: true })],
  controllers: [DemoController],
})
export class AppModule {}
