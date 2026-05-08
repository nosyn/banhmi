// Demo: @banhmi/session — counter session.
//
// GET / — increments and returns a counter stored in the session.
import type { RouteCtx } from '@banhmi/common'
import { getSession, Session, SessionModule } from '@banhmi/session'
import { Controller, Get, Module } from 'banhmi'

const DEMO_SECRET = 'demo-session-secret'

@Controller()
export class CounterController {
  @Get('/')
  @Session({ secret: DEMO_SECRET })
  async index(ctx: RouteCtx) {
    const s = getSession(ctx)
    const count = (s.get<number>('count') ?? 0) + 1
    s.set('count', count)
    return { count }
  }
}

@Module({
  imports: [SessionModule.forRoot({ secret: DEMO_SECRET })],
  controllers: [CounterController],
})
export class AppModule {}
