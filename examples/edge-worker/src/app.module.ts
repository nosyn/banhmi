import { Controller, Get, Injectable, Module } from '@banhmi/common'

@Injectable()
class GreetService {
  greet(name: string): string {
    return `Hello, ${name}! (from edge worker)`
  }
}

@Controller('/')
class GreetController {
  static inject = [GreetService] as const

  constructor(private svc: GreetService) {}

  @Get('/')
  root(): { message: string } {
    return { message: this.svc.greet('world') }
  }

  @Get('/health')
  health(): { status: string } {
    return { status: 'ok' }
  }
}

@Module({ controllers: [GreetController], providers: [GreetService] })
export class AppModule {}
