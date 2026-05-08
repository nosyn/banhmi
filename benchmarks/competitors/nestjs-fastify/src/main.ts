import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  )
  const port = Number(process.env.PORT ?? 3003)
  await app.listen(port, '0.0.0.0')
  console.log(`nestjs-fastify listening on :${port}`)
}
bootstrap()
