import { Module } from '@nestjs/common'
import { BodyController } from './body.controller'
import { HelloController } from './hello.controller'

@Module({ controllers: [HelloController, BodyController] })
export class AppModule {}
