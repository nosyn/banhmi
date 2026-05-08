import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false })
  const port = Number(process.env.PORT ?? 3002)
  await app.listen(port)
  console.log(`nestjs-express listening on :${port}`)
}
bootstrap()
