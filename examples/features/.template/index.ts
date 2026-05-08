// Single-file demo. Replace this comment with a one-line description of the feature.
import { Controller, Get, Module } from 'banhmi'

@Controller()
export class HelloController {
  @Get('/')
  hello() {
    return { ok: true }
  }
}

@Module({ controllers: [HelloController] })
export class AppModule {}
