// Demo: @banhmi/logger — structured logging with child contexts.
//
// GET /hello — logs an info record with the request path and returns a greeting.
import type { RouteCtx } from '@banhmi/common'
import type { Logger } from '@banhmi/logger'
import { InjectLogger, LoggerModule, ROOT_LOGGER } from '@banhmi/logger'
import { Controller, Get, Injectable, Module } from 'banhmi'

@Injectable()
export class GreetService {
  static inject = [InjectLogger('GreetService')] as const

  constructor(private readonly logger: Logger) {}

  greet(path: string): string {
    this.logger.info('greet called', { path })
    return `Hello from ${path}`
  }
}

@Controller()
export class GreetController {
  static inject = [GreetService, ROOT_LOGGER] as const

  constructor(
    private readonly greetService: GreetService,
    private readonly logger: Logger,
  ) {}

  @Get('/hello')
  hello(ctx: RouteCtx) {
    this.logger.info('request received', { path: ctx.url })
    const message = this.greetService.greet(ctx.url)
    return { message }
  }
}

@Module({
  imports: [LoggerModule.forRoot({ level: 'info' })],
  controllers: [GreetController],
  providers: [
    GreetService,
    {
      provide: InjectLogger('GreetService'),
      useFactory: (root: Logger) => root.child({ name: 'GreetService' }),
      inject: [ROOT_LOGGER],
    },
  ],
})
export class AppModule {}
