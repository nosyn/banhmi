// Demo: @banhmi/security CsrfModule — double-submit cookie round-trip.
//
// GET /       → issues csrf-token cookie + x-csrf-token header
// POST /form  → requires cookie == header; returns 403 on mismatch
import { CsrfModule } from '@banhmi/security'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module, Post } from 'banhmi'

@Controller()
export class DemoController {
  @Get('/')
  index(_ctx: RouteCtx) {
    return { ready: true }
  }

  @Post('/form')
  form(_ctx: RouteCtx) {
    return { accepted: true }
  }
}

@Module({
  imports: [CsrfModule.forRoot()],
  controllers: [DemoController],
})
export class AppModule {}
