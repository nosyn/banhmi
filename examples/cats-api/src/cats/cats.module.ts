import { Module } from 'banhmi'
import { CatsController } from './cats.controller'
import { CatsV1Controller } from './cats.controller.v1'
import { CatsV2Controller } from './cats.controller.v2'
import { CatsService } from './cats.service'

@Module({
  controllers: [CatsController, CatsV1Controller, CatsV2Controller],
  providers: [CatsService],
  exports: [CatsService],
})
export class CatsModule {}
