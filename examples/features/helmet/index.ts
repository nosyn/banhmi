// Demo: @banhmi/security HelmetModule — security headers on every response.
import { HelmetModule } from '@banhmi/security'
import { Controller, Get, Module } from 'banhmi'

@Controller()
export class DemoController {
  @Get('/')
  index() {
    return { hello: 'world' }
  }
}

@Module({
  imports: [HelmetModule.forRoot()],
  controllers: [DemoController],
})
export class AppModule {}
