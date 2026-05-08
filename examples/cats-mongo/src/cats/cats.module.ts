import { MongoModule } from '@banhmi/mongo'
import { Module } from 'banhmi'
import { CatsController } from './cats.controller'
import { CatsRepository } from './cats.repository'

/**
 * Feature module for the `Cat` entity.
 *
 * Registers `CatsRepository` via `MongoModule.forFeature` and wires up
 * `CatsController` as the HTTP interface.
 */
@Module({
  imports: [MongoModule.forFeature([CatsRepository])],
  controllers: [CatsController],
})
export class CatsModule {}
