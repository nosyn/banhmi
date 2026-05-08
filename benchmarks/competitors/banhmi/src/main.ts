import { BanhmiFactory, Controller, Get, Module } from 'banhmi'

@Controller()
class Hello {
  @Get('/')
  hello() {
    return { hello: 'world' }
  }
}

@Module({ controllers: [Hello] })
class AppModule {}

const port = Number(Bun.env.PORT ?? 3001)
const app = await BanhmiFactory.create(AppModule)
await app.listen(port)
console.log(`banhmi listening on :${port}`)
