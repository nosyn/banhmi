// Demo: @banhmi/events — in-process pub/sub with @OnEvent.
//
// POST /users — emits 'user.created'; the NotifService listener receives it.
// GET  /notifs — returns the list of received events.
import type { RouteCtx } from '@banhmi/common'
import {
  EVENT_EMITTER_TOKEN,
  type EventEmitter,
  EventEmitterModule,
  OnEvent,
} from '@banhmi/events'
import { Controller, Get, Injectable, Module, Post } from 'banhmi'

const received: unknown[] = []

@Injectable()
export class NotifService {
  @OnEvent('user.*')
  handleUserEvent(payload: unknown, eventName: string) {
    received.push({ event: eventName, payload })
  }
}

@Controller()
export class UsersController {
  static inject = [EVENT_EMITTER_TOKEN] as const

  constructor(private readonly emitter: EventEmitter) {}

  @Post('/users')
  async create(ctx: RouteCtx) {
    const body = (await ctx.json()) as Record<string, unknown>
    this.emitter.emit('user.created', body)
    return { ok: true }
  }

  @Get('/notifs')
  list() {
    return received
  }
}

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [UsersController],
  providers: [NotifService],
})
export class AppModule {}
