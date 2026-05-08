// Demo: @banhmi/scheduling — interval and timeout decorators.
//
// GET /ticks — returns the count of interval ticks so far.
import type { RouteCtx } from '@banhmi/common'
import { Interval, ScheduleModule } from '@banhmi/scheduling'
import { Controller, Get, Injectable, Module } from 'banhmi'

let tickCount = 0

@Injectable()
export class ClockService {
  /**
   * Fires every 100ms. In production replace with a longer interval like
   * `@Cron('* * * * *')`.
   */
  @Interval(100)
  tick() {
    tickCount++
  }
}

@Controller()
export class ClockController {
  @Get('/ticks')
  getTicks(_ctx: RouteCtx) {
    return { ticks: tickCount }
  }
}

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ClockController],
  providers: [ClockService],
})
export class AppModule {}
